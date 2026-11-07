import { type FlowCardPlusConfig, type IndividualObject } from "@flixlix-cards/shared/types";
import { type Balance } from "./nodes";
import { type CardState, type Flow, type FlowName, type Flows } from "./types";

/** Seconds per dot when a flow's rate is not calculated from its value. */
const FIXED_FLOW_DURATION = 1.66;

const mapRange = (
  value: number,
  minOut: number,
  maxOut: number,
  minIn: number,
  maxIn: number
): number => {
  if (value > maxIn) {
    return maxOut;
  }
  return ((value - minIn) * (maxOut - minOut)) / (maxIn - minIn) + minOut;
};

/** Seconds per dot: faster for larger values, absolute or relative to `total`. */
const flowRate = (config: FlowCardPlusConfig, value: number, total: number): number => {
  const min = config.min_flow_rate;
  const max = config.max_flow_rate;
  const relative = () => {
    const denominator = total > 0 ? total : value > 0 ? value : 1;
    return max - (value / denominator) * (max - min);
  };
  const result =
    (config.use_new_flow_rate_model ?? true)
      ? mapRange(value, max, min, config.min_expected_power, config.max_expected_power)
      : relative();
  return Number.isFinite(result) ? result : max;
};

/**
 * `calculate_flow_rate: false` animates at a fixed pace; a number is the fallback pace used
 * when the calculated rate is unusable.
 */
const configuredDuration = (calculateFlowRate: boolean | number | undefined, rate: number) => {
  if (calculateFlowRate !== false && rate) {
    return rate;
  }
  return typeof calculateFlowRate === "number" ? calculateFlowRate : FIXED_FLOW_DURATION;
};

/** Lines with nothing flowing are hidden, greyed out or faded per `display_zero_lines`. */
const zeroLine = (config: FlowCardPlusConfig, value: number, visible: boolean) => {
  const mode = config.display_zero_lines?.mode;
  if (value > 0 || mode === undefined || mode === "show") {
    return { visible, lineClass: "" };
  }
  const fades =
    (mode === "transparency" || mode === "custom") &&
    (config.display_zero_lines?.transparency ?? 50) > 0;
  const greys = mode === "grey_out" || mode === "custom";
  return {
    visible: visible && mode !== "hide",
    lineClass: `${fades ? "transparency " : ""}${greys ? "grey" : ""}`,
  };
};

type LineOptions = { visible: boolean; duration?: number };

const line = (
  config: FlowCardPlusConfig,
  value: number,
  total: number,
  { visible, duration = flowRate(config, value, total) }: LineOptions
): Flow => ({ value, durationSeconds: duration, ...zeroLine(config, value, visible) });

export type FlowContext = {
  config: FlowCardPlusConfig;
  balance: Balance;
  individuals: IndividualObject[];
  hasReturnToGrid: boolean;
};

export const computeFlows = ({
  config,
  balance,
  individuals,
  hasReturnToGrid,
}: FlowContext): Flows => {
  const { presence: has, flows } = balance;
  const toHomeDrawn = !config.entities.home?.hide;
  const total = [
    flows.gridToHome,
    flows.solarToHome,
    flows.solarToGrid,
    flows.solarToBattery,
    flows.batteryToHome,
    flows.gridToBattery,
    flows.batteryToGrid,
  ].reduce((sum, value) => sum + value, 0);
  const totalIndividual = individuals.reduce(
    (sum, individual) => sum + (individual.has ? (individual.state ?? 0) : 0),
    0
  );
  const nonFossilPower = flows.nonFossilToHome;
  const fossil = config.entities.fossil_fuel_percentage;
  return {
    batteryGrid: batteryGridLine(config, balance, total),
    batteryToHome: line(config, flows.batteryToHome, total, {
      visible: has.battery && toHomeDrawn,
    }),
    gridToHome: gridToHomeLine(config, balance, total, toHomeDrawn),
    solarToBattery: line(config, flows.solarToBattery, total, {
      visible: has.battery && has.solar,
    }),
    solarToGrid: line(config, flows.solarToGrid, total, {
      visible: has.grid && hasReturnToGrid && has.solar,
    }),
    solarToHome: line(config, flows.solarToHome, total, { visible: has.solar && toHomeDrawn }),
    nonFossil: line(config, nonFossilPower, total, {
      visible: true,
      duration: configuredDuration(
        fossil?.calculate_flow_rate,
        flowRate(config, nonFossilPower, total)
      ),
    }),
    individual: individuals.map((individual) => {
      const value = individual.state ?? 0;
      return line(config, value, totalIndividual, {
        visible: toHomeDrawn,
        duration: configuredDuration(
          individual.field?.calculate_flow_rate,
          flowRate(config, value, totalIndividual)
        ),
      });
    }),
  };
};

/** The grid line is drawn while importing, but styled by what reaches home. */
const gridToHomeLine = (
  config: FlowCardPlusConfig,
  { totals, presence, flows }: Balance,
  total: number,
  toHomeDrawn: boolean
): Flow => {
  const drawn = zeroLine(config, totals.gridImport, presence.grid && toHomeDrawn);
  return {
    ...line(config, flows.gridToHome, total, { visible: true }),
    visible: drawn.visible,
  };
};

/** One line carries both directions between grid and battery. */
const batteryGridLine = (
  config: FlowCardPlusConfig,
  { presence, flows }: Balance,
  total: number
): Flow => {
  const value = Math.max(flows.gridToBattery, flows.batteryToGrid);
  const styledBy = flows.batteryToGrid === 0 ? flows.gridToBattery : flows.batteryToGrid;
  return {
    ...line(config, value, total, { visible: presence.grid && presence.battery }),
    lineClass: zeroLine(config, styledBy, true).lineClass,
  };
};

const ANIMATED_FLOWS = [
  "batteryGrid",
  "batteryToHome",
  "gridToHome",
  "solarToBattery",
  "solarToGrid",
  "solarToHome",
] as const satisfies FlowName[];

/** Ratio by which running dot animations are rescaled so dots keep their place on the line. */
export const animationRescale = (
  flows: Flows,
  animate: boolean,
  previous: CardState | undefined
): Partial<Record<FlowName, number>> => {
  if (!animate || previous?.status !== "ready" || !previous.animate) {
    return {};
  }
  return Object.fromEntries(
    ANIMATED_FLOWS.flatMap((name): [FlowName, number][] => {
      const before = previous.flows[name].durationSeconds;
      const after = flows[name].durationSeconds;
      const ratio = after / before;
      return before > 0 && before !== after && Number.isFinite(ratio) ? [[name, ratio]] : [];
    })
  );
};
