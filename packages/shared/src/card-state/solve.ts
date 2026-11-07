import { type NodeTotals } from "./normalize";

type Source = "grid" | "solar" | "battery";
type Sink = "battery" | "grid" | "home";

type AllocatedFlow =
  | "solarToHome"
  | "solarToBattery"
  | "solarToGrid"
  | "gridToHome"
  | "gridToBattery"
  | "batteryToHome"
  | "batteryToGrid";

/** How much each node moves to each other node, and what home consumes as balanced from them. */
export type NodeFlows = Readonly<
  Record<AllocatedFlow, number> & {
    nonFossilToHome: number;
    /** Home consumption balanced from the sources: the sum of every flow into home. */
    home: number;
    /** Measured home minus balanced home; 0 without a measured home. */
    unaccounted: number;
  }
>;

type Remaining = Readonly<{
  sources: Readonly<Record<Source, number>>;
  sinks: Readonly<Record<Sink, number>>;
}>;

type AllocationStep = Readonly<{
  flow: AllocatedFlow;
  source: Source;
  sink: Sink;
  /** Upper bound for this step, from what is still unallocated before it. */
  cap: (remaining: Remaining) => number;
}>;

const uncapped = () => Number.POSITIVE_INFINITY;

/**
 * The order the Home Assistant energy dashboard allocates sources to sinks in. The grid charges
 * the battery first only with the import home cannot have consumed.
 */
export const ALLOCATION_ORDER: ReadonlyArray<AllocationStep> = [
  {
    flow: "gridToBattery",
    source: "grid",
    sink: "battery",
    cap: ({ sources, sinks }) => Math.max(0, sources.grid - sinks.home),
  },
  { flow: "solarToBattery", source: "solar", sink: "battery", cap: uncapped },
  { flow: "solarToGrid", source: "solar", sink: "grid", cap: uncapped },
  { flow: "batteryToGrid", source: "battery", sink: "grid", cap: uncapped },
  { flow: "gridToBattery", source: "grid", sink: "battery", cap: uncapped },
  { flow: "solarToHome", source: "solar", sink: "home", cap: uncapped },
  { flow: "batteryToHome", source: "battery", sink: "home", cap: uncapped },
  { flow: "gridToHome", source: "grid", sink: "home", cap: uncapped },
];

type Ledger = Remaining & Readonly<{ flows: Readonly<Record<AllocatedFlow, number>> }>;

const allocate = (ledger: Ledger, step: AllocationStep): Ledger => {
  const amount = Math.max(
    0,
    Math.min(ledger.sources[step.source], ledger.sinks[step.sink], step.cap(ledger))
  );
  return {
    sources: { ...ledger.sources, [step.source]: ledger.sources[step.source] - amount },
    sinks: { ...ledger.sinks, [step.sink]: ledger.sinks[step.sink] - amount },
    flows: { ...ledger.flows, [step.flow]: ledger.flows[step.flow] + amount },
  };
};

const opening = (totals: NodeTotals): Ledger => ({
  sources: { grid: totals.gridImport, solar: totals.solar, battery: totals.batteryDischarge },
  sinks: {
    grid: totals.gridExport,
    battery: totals.batteryCharge,
    home: Math.max(
      totals.gridImport +
        totals.solar +
        totals.batteryDischarge -
        totals.gridExport -
        totals.batteryCharge,
      0
    ),
  },
  flows: {
    solarToHome: 0,
    solarToBattery: 0,
    solarToGrid: 0,
    gridToHome: 0,
    gridToBattery: 0,
    batteryToHome: 0,
    batteryToGrid: 0,
  },
});

/** Allocates the node totals to flows in {@link ALLOCATION_ORDER}. */
export const solve = (totals: NodeTotals): NodeFlows => {
  const { flows } = ALLOCATION_ORDER.reduce(allocate, opening(totals));
  const home = flows.solarToHome + flows.batteryToHome + flows.gridToHome;
  return {
    ...flows,
    nonFossilToHome: flows.gridToHome * totals.nonFossilFraction,
    home,
    unaccounted: totals.measuredHome === undefined ? 0 : totals.measuredHome - home,
  };
};
