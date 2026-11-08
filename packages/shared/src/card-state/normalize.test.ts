import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { fakeConfig, fakeEntity, fakeHass } from "../testing/fixtures";
import { type FlowCardPlusConfig } from "../types";
import { normalize } from "./normalize";
import { solve } from "./solve";
import { type ReadyReadings, type TwoWayReading, type UnitFamily } from "./types";

const RUNS = { numRuns: 1000, seed: 20261107 };

const none: TwoWayReading = { kind: "split", into: null, outOf: null };

const readings = (overrides: Partial<ReadyReadings> = {}): ReadyReadings => ({
  status: "ready",
  family: "power",
  grid: none,
  solar: { total: null, secondary: 0 },
  battery: none,
  home: null,
  generator: null,
  individuals: [],
  ...overrides,
});

const grid = { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } };

const input = (entities: FlowCardPlusConfig["entities"], states: Record<string, string> = {}) => ({
  config: fakeConfig({ entities }),
  hass: fakeHass({
    states: Object.fromEntries(
      Object.entries(states).map(([id, state]) => [id, fakeEntity(id, state)])
    ),
  }),
});

const single = (value: number | null): TwoWayReading => ({ kind: "single", value });

const singleGridTotals = (value: number) =>
  normalize(input({ grid }), readings({ grid: single(value) })).totals;

const measured = (override: boolean) =>
  normalize(
    input({ home: { entity: "sensor.home", override_state: override } }),
    readings({ home: 420 })
  ).totals.measuredHome;

const fraction = (percentage: string) =>
  normalize(
    input(
      { grid, fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} } },
      { "sensor.fossil": percentage, "binary_sensor.outage": "off" }
    ),
    readings({ grid: single(100) })
  ).totals.nonFossilFraction;

describe("signs and invert_state", () => {
  test("a single grid entity reads positive as import and negative as export", () => {
    expect(singleGridTotals(500)).toMatchObject({ gridImport: 500, gridExport: 0 });
    expect(singleGridTotals(-200)).toMatchObject({ gridImport: 0, gridExport: 200 });
  });

  test.each<[UnitFamily, boolean, { batteryCharge: number; batteryDischarge: number }]>([
    ["power", false, { batteryCharge: 0, batteryDischarge: 300 }],
    ["power", true, { batteryCharge: 300, batteryDischarge: 0 }],
    ["energy", false, { batteryCharge: 300, batteryDischarge: 0 }],
    ["energy", true, { batteryCharge: 0, batteryDischarge: 300 }],
  ])("a single %s battery entity with invert_state %s", (family, invert, expected) => {
    const { totals } = normalize(
      input({ battery: { entity: "sensor.battery", invert_state: invert } }),
      readings({ family, battery: single(300) })
    );

    expect(totals).toMatchObject(expected);
  });

  test("invert_state swaps a single grid entity and makes negative solar production", () => {
    const { totals } = normalize(
      input({
        grid: { ...grid, invert_state: true },
        solar: { entity: "sensor.solar", invert_state: true },
      }),
      readings({ grid: single(500), solar: { total: -800, secondary: 0 } })
    );

    expect(totals).toMatchObject({ gridImport: 0, gridExport: 500, solar: 800 });
  });

  test("split entities are read per direction; unavailable readings are 0", () => {
    const { totals } = normalize(
      input({ grid, battery: { entity: { consumption: "a", production: "b" } } }),
      readings({ grid: { kind: "split", into: 30, outOf: 120 }, battery: none })
    );

    expect(totals).toMatchObject({
      gridImport: 120,
      gridExport: 30,
      batteryCharge: 0,
      batteryDischarge: 0,
    });
  });

  test("individual devices count as absolute values", () => {
    const { totals, presence } = normalize(
      input({ individual: [{ entity: "sensor.device" }, { entity: "sensor.off" }] }),
      readings({ individuals: [-50, null] })
    );

    expect(totals.individuals).toEqual([50, 0]);
    expect(presence.individuals).toEqual([true, false]);
  });
});

describe("tolerance, outage and hidden nodes", () => {
  test("each node's tolerance zeroes its own totals once", () => {
    const { totals } = normalize(
      input({
        grid: { ...grid, display_zero_tolerance: 6 },
        battery: { entity: "sensor.battery", display_zero_tolerance: 6 },
      }),
      readings({
        grid: { kind: "split", outOf: 10, into: 5 },
        battery: { kind: "split", outOf: 6, into: 2 },
      })
    );

    expect(totals).toMatchObject({
      gridImport: 10,
      gridExport: 0,
      batteryDischarge: 6,
      batteryCharge: 0,
    });
  });

  test("an outage replaces grid import by the generator and stops export", () => {
    const result = normalize(
      input(
        { grid, fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} } },
        { "binary_sensor.outage": "on", "sensor.fossil": "50" }
      ),
      readings({ grid: { kind: "split", outOf: 600, into: 200 }, generator: 1234 })
    );

    expect(result.outage).toBe(true);
    expect(result.totals).toMatchObject({ gridImport: 1234, gridExport: 0, nonFossilFraction: 0 });
    expect(result.presence.nonFossil).toBe(false);
  });

  test.each<[boolean | undefined, boolean]>([
    [undefined, false],
    [true, true],
  ])(
    "grid import within the tolerance with display_zero %s shows non-fossil: %s",
    (displayZero, expected) => {
      const { presence } = normalize(
        input(
          {
            grid: { ...grid, display_zero_tolerance: 20 },
            fossil_fuel_percentage: {
              entity: "sensor.fossil",
              display_zero: displayZero,
              secondary_info: {},
            },
          },
          { "sensor.fossil": "40", "binary_sensor.outage": "off" }
        ),
        readings({ grid: single(12) })
      );

      expect(presence.nonFossil).toBe(expected);
    }
  );

  test("a hidden grid has no totals", () => {
    const { totals, presence } = normalize(
      input({ grid: { ...grid, display_zero: false, display_zero_tolerance: 10 } }),
      readings({ grid: { kind: "split", outOf: 8, into: 0 } })
    );

    expect(presence.grid).toBe(false);
    expect(totals).toMatchObject({ gridImport: 0, gridExport: 0 });
  });

  test("the home entity's reading is measured only with override_state", () => {
    expect(measured(true)).toBe(420);
    expect(measured(false)).toBeUndefined();
  });

  test("the non-fossil fraction comes from the fossil percentage, clamped to [0, 1]", () => {
    expect(fraction("30")).toBeCloseTo(0.7, 10);
    expect(fraction("140")).toBe(0);
  });
});

const reading = fc.oneof(
  fc.constant(null),
  fc.constant(0),
  fc.integer({ min: -5000, max: 5000 }),
  fc.double({ min: -1e6, max: 1e6, noNaN: true })
);

const twoWay: fc.Arbitrary<TwoWayReading> = fc.oneof(
  fc.record({ kind: fc.constant("single" as const), value: reading }),
  fc.record({ kind: fc.constant("split" as const), into: reading, outOf: reading })
);

const scenario = fc.record({
  family: fc.constantFrom<UnitFamily>("power", "energy"),
  grid: twoWay,
  battery: twoWay,
  solar: reading,
  generator: reading,
  home: reading,
  outage: fc.boolean(),
  gridHidden: fc.boolean(),
  invert: fc.boolean(),
  tolerance: fc.constantFrom(0, 10, 100),
});

type Scenario = typeof scenario extends fc.Arbitrary<infer T> ? T : never;

const normalized = (s: Scenario) =>
  normalize(
    input(
      {
        grid: s.gridHidden
          ? undefined
          : {
              ...grid,
              invert_state: s.invert,
              display_zero_tolerance: s.tolerance,
            },
        solar: { entity: "sensor.solar", display_zero_tolerance: s.tolerance },
        battery: { entity: "sensor.battery", invert_state: s.invert },
        home: { entity: "sensor.home", override_state: true },
      },
      { "binary_sensor.outage": s.outage ? "on" : "off" }
    ),
    readings({
      family: s.family,
      grid: s.grid,
      battery: s.battery,
      solar: { total: s.solar, secondary: 0 },
      generator: s.generator,
      home: s.home,
    })
  );

describe("normalize properties", () => {
  test("every total is finite and non-negative", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const { totals } = normalized(s);
        const values = [
          totals.gridImport,
          totals.gridExport,
          totals.solar,
          totals.batteryCharge,
          totals.batteryDischarge,
          totals.measuredHome ?? 0,
          totals.nonFossilFraction,
        ];
        expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
      }),
      RUNS
    );
  });

  test("during an outage nothing flows into the grid", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const flows = solve(normalized({ ...s, outage: true }).totals);
        expect(flows.solarToGrid + flows.batteryToGrid).toBe(0);
      }),
      RUNS
    );
  });

  test("a hidden grid takes no flows and the rest stays within each node's totals", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const { totals } = normalized({ ...s, gridHidden: true });
        const f = solve(totals);
        const slack =
          1e-9 * Math.max(totals.solar, totals.batteryCharge, totals.batteryDischarge, 1);
        expect(f.gridToHome + f.gridToBattery + f.solarToGrid + f.batteryToGrid).toBe(0);
        expect(f.solarToHome + f.solarToBattery).toBeLessThanOrEqual(totals.solar + slack);
        expect(f.batteryToHome).toBeLessThanOrEqual(totals.batteryDischarge + slack);
        expect(f.solarToBattery).toBeLessThanOrEqual(totals.batteryCharge + slack);
      }),
      RUNS
    );
  });

  test("unaccounted is measured home minus balanced home", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const { totals } = normalized(s);
        const f = solve(totals);
        expect(f.unaccounted).toBe((totals.measuredHome ?? Number.NaN) - f.home);
      }),
      RUNS
    );
  });
});

describe("presence", () => {
  test("a node with an empty entity, as left by clearing it in the editor, is not drawn", () => {
    const { presence } = normalize(
      input({
        grid: { entity: "" },
        solar: { entity: "" },
        battery: { entity: { consumption: "", production: "" } },
      }),
      readings({ grid: single(400), solar: { total: 800, secondary: 0 }, battery: single(200) })
    );
    expect(presence).toMatchObject({ grid: false, solar: false, battery: false });
  });

  test("split entities count with one side set", () => {
    const { presence } = normalize(
      input({ grid: { entity: { consumption: "sensor.import", production: "" } } }),
      readings({ grid: { kind: "split", into: 0, outOf: 400 } })
    );
    expect(presence.grid).toBe(true);
  });
});
