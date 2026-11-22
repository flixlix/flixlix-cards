import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { type NodeTotals } from "./normalize";
import { type Topology } from "../types";
import { type NodeFlows, solve } from "./solve";

const RUNS = { numRuns: 1000, seed: 20261107 };

const totals = (overrides: Partial<NodeTotals>): NodeTotals => ({
  gridImport: 0,
  gridExport: 0,
  solar: 0,
  batteryCharge: 0,
  batteryDischarge: 0,
  individuals: [],
  nonFossilFraction: 0,
  ...overrides,
});

const amount = fc.oneof(
  fc.constant(0),
  fc.integer({ min: 0, max: 10_000 }),
  fc.double({ min: 0, max: 1e7, noNaN: true, noDefaultInfinity: true })
);

const arbitraryTotals: fc.Arbitrary<NodeTotals> = fc.record({
  gridImport: amount,
  gridExport: amount,
  solar: amount,
  batteryCharge: amount,
  batteryDischarge: amount,
  measuredHome: fc.option(amount, { nil: undefined }),
  individuals: fc.constant([]),
  nonFossilFraction: fc.double({ min: 0, max: 1, noNaN: true }),
});

const FLOW_NAMES = [
  "solarToHome",
  "solarToBattery",
  "solarToGrid",
  "gridToHome",
  "gridToBattery",
  "batteryToHome",
  "batteryToGrid",
  "nonFossilToHome",
  "home",
] as const;

const scale = (t: NodeTotals) =>
  Math.max(t.gridImport, t.gridExport, t.solar, t.batteryCharge, t.batteryDischarge, 1);

const withSlack = (limit: number, magnitude: number) => limit + 1e-9 * magnitude;

describe("golden scenarios", () => {
  test.each<[string, Partial<NodeTotals>, Partial<NodeFlows>]>([
    [
      "solar feeds battery and export first, then home; the grid covers the rest",
      {
        gridImport: 600,
        gridExport: 200,
        solar: 1000,
        batteryDischarge: 400,
        batteryCharge: 300,
        nonFossilFraction: 0.7,
      },
      {
        solarToBattery: 300,
        solarToGrid: 200,
        solarToHome: 500,
        batteryToHome: 400,
        batteryToGrid: 0,
        gridToHome: 600,
        gridToBattery: 0,
        nonFossilToHome: 420,
        home: 1500,
      },
    ],
    [
      "import home cannot use charges the battery; export beyond solar comes from the battery",
      {
        gridImport: 200,
        gridExport: 600,
        solar: 500,
        batteryDischarge: 150,
        batteryCharge: 200,
        nonFossilFraction: 0.75,
      },
      {
        gridToBattery: 150,
        solarToBattery: 50,
        solarToGrid: 450,
        batteryToGrid: 150,
        solarToHome: 0,
        batteryToHome: 0,
        gridToHome: 50,
        nonFossilToHome: 37.5,
        home: 50,
      },
    ],
    [
      "a generator during an outage feeds home next to the battery",
      { gridImport: 1234, batteryDischarge: 300 },
      { gridToHome: 1234, batteryToHome: 300, batteryToGrid: 0, home: 1534 },
    ],
    [
      "bug #795/#830/#890: solar charging the battery is solar→battery, home stays grid import",
      { gridImport: 354, solar: 65, batteryCharge: 65 },
      { solarToBattery: 65, solarToHome: 0, gridToBattery: 0, gridToHome: 354, home: 354 },
    ],
    [
      "without solar, export comes from the battery",
      { gridImport: 300, gridExport: 90, batteryDischarge: 160 },
      { batteryToGrid: 90, batteryToHome: 70, gridToHome: 300, home: 370 },
    ],
    [
      "solar zeroed by its tolerance leaves battery charging to the grid",
      { gridImport: 100, batteryCharge: 10 },
      { solarToBattery: 0, gridToBattery: 10, gridToHome: 90, home: 90 },
    ],
    [
      "energy period totals in energy dashboard order",
      { gridImport: 20, gridExport: 4, solar: 18, batteryDischarge: 6, batteryCharge: 7 },
      {
        gridToBattery: 0,
        gridToHome: 20,
        solarToBattery: 7,
        solarToGrid: 4,
        solarToHome: 7,
        batteryToHome: 6,
        home: 33,
      },
    ],
    [
      "import and export at once with nothing else is not consumption",
      { gridImport: 100, gridExport: 100 },
      { gridToHome: 0, home: 0 },
    ],
  ])("%s", (_name, given, expected) => {
    expect(solve(totals(given))).toMatchObject(expected);
  });

  test("unaccounted is measured home minus balanced home", () => {
    expect(solve(totals({ gridImport: 300, measuredHome: 350 })).unaccounted).toBe(50);
    expect(solve(totals({ gridImport: 300, measuredHome: 250 })).unaccounted).toBe(-50);
    expect(solve(totals({ gridImport: 300 })).unaccounted).toBe(0);
  });
});

describe("solve properties", () => {
  test("every flow is finite and non-negative", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const flows = solve(t);
        for (const name of FLOW_NAMES) {
          expect(Number.isFinite(flows[name]) && flows[name] >= 0).toBe(true);
        }
      }),
      RUNS
    );
  });

  test("no source gives more than its total", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const f = solve(t);
        const m = scale(t);
        expect(f.solarToHome + f.solarToBattery + f.solarToGrid).toBeLessThanOrEqual(
          withSlack(t.solar, m)
        );
        expect(f.gridToHome + f.gridToBattery).toBeLessThanOrEqual(withSlack(t.gridImport, m));
        expect(f.batteryToHome + f.batteryToGrid).toBeLessThanOrEqual(
          withSlack(t.batteryDischarge, m)
        );
        expect(f.nonFossilToHome).toBeLessThanOrEqual(withSlack(f.gridToHome, m));
      }),
      RUNS
    );
  });

  test("no sink takes more than its total", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const f = solve(t);
        const m = scale(t);
        const consumption = Math.max(
          t.gridImport + t.solar + t.batteryDischarge - t.gridExport - t.batteryCharge,
          0
        );
        expect(f.solarToBattery + f.gridToBattery).toBeLessThanOrEqual(
          withSlack(t.batteryCharge, m)
        );
        expect(f.solarToGrid + f.batteryToGrid).toBeLessThanOrEqual(withSlack(t.gridExport, m));
        expect(f.home).toBeLessThanOrEqual(withSlack(consumption, m));
      }),
      RUNS
    );
  });

  test("home is the sum of the flows into home", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const f = solve(t);
        expect(f.home).toBe(f.solarToHome + f.batteryToHome + f.gridToHome);
      }),
      RUNS
    );
  });

  test("scaling every total scales every flow", () => {
    fc.assert(
      fc.property(arbitraryTotals, fc.double({ min: 1e-3, max: 1e3, noNaN: true }), (t, k) => {
        const flows = solve(t);
        const scaled = solve({
          ...t,
          gridImport: t.gridImport * k,
          gridExport: t.gridExport * k,
          solar: t.solar * k,
          batteryCharge: t.batteryCharge * k,
          batteryDischarge: t.batteryDischarge * k,
        });
        const m = scale(t) * Math.max(k, 1);
        for (const name of FLOW_NAMES) {
          expect(Math.abs(scaled[name] - flows[name] * k)).toBeLessThanOrEqual(1e-9 * m);
        }
      }),
      RUNS
    );
  });

  test("is deterministic", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        expect(solve(t)).toEqual(solve({ ...t }));
      }),
      RUNS
    );
  });

  test("unaccounted is measured − home with a measurement, else 0", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const f = solve(t);
        expect(f.unaccounted).toBe(t.measuredHome === undefined ? 0 : t.measuredHome - f.home);
      }),
      RUNS
    );
  });
});

const batteryNet = (f: NodeFlows) =>
  f.solarToBattery + f.gridToBattery - f.batteryToHome - f.batteryToGrid;

describe("topologies", () => {
  test("standard is the default", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        expect(solve(t, "standard")).toEqual(solve(t));
      }),
      RUNS
    );
  });

  test.each<[string, Topology, Partial<NodeTotals>, Partial<NodeFlows>]>([
    [
      "battery_hub: issue #123, solar and grid charge the battery and only the battery feeds home",
      "battery_hub",
      { gridImport: 500, solar: 3000, batteryCharge: 1500, nonFossilFraction: 0.5 },
      {
        solarToHome: 0,
        solarToGrid: 0,
        gridToHome: 0,
        solarToBattery: 3000,
        gridToBattery: 500,
        batteryToHome: 2000,
        batteryToGrid: 0,
        nonFossilToHome: 0,
        home: 2000,
      },
    ],
    [
      "battery_hub: export leaves through the battery",
      "battery_hub",
      { gridExport: 400, solar: 1000, batteryDischarge: 200 },
      { solarToGrid: 0, solarToBattery: 1000, batteryToGrid: 400, batteryToHome: 800, home: 800 },
    ],
    [
      "isolated_battery: a battery discharging during export feeds home, solar covers the export",
      "isolated_battery",
      { gridExport: 2000, solar: 2500, batteryDischarge: 30 },
      { batteryToGrid: 0, solarToGrid: 2000, batteryToHome: 30, solarToHome: 500, home: 530 },
    ],
    [
      "isolated_battery: the grid never charges the battery",
      "isolated_battery",
      { gridImport: 200, gridExport: 600, solar: 500, batteryDischarge: 150, batteryCharge: 200 },
      { gridToBattery: 0, batteryToGrid: 0, solarToBattery: 200 },
    ],
  ])("%s", (_name, topology, given, expected) => {
    expect(solve(totals(given), topology)).toMatchObject(expected);
  });

  test("battery_hub routes every flow through the battery without changing home or the battery's net", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const standard = solve(t);
        const hub = solve(t, "battery_hub");
        const m = scale(t);
        expect(hub.solarToHome + hub.solarToGrid + hub.gridToHome).toBe(0);
        expect(Math.abs(hub.home - standard.home)).toBeLessThanOrEqual(1e-9 * m);
        expect(Math.abs(batteryNet(hub) - batteryNet(standard))).toBeLessThanOrEqual(1e-9 * m);
      }),
      RUNS
    );
  });

  test("isolated_battery never moves power between battery and grid and stays within every total", () => {
    fc.assert(
      fc.property(arbitraryTotals, (t) => {
        const f = solve(t, "isolated_battery");
        const m = scale(t);
        expect(f.gridToBattery + f.batteryToGrid).toBe(0);
        expect(f.solarToHome + f.solarToBattery + f.solarToGrid).toBeLessThanOrEqual(
          withSlack(t.solar, m)
        );
        expect(f.gridToHome).toBeLessThanOrEqual(withSlack(t.gridImport, m));
        expect(f.batteryToHome).toBeLessThanOrEqual(withSlack(t.batteryDischarge, m));
        expect(f.solarToBattery).toBeLessThanOrEqual(withSlack(t.batteryCharge, m));
        expect(f.solarToGrid).toBeLessThanOrEqual(withSlack(t.gridExport, m));
        expect(f.home).toBe(f.solarToHome + f.batteryToHome + f.gridToHome);
      }),
      RUNS
    );
  });
});
