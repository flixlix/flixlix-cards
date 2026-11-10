import { fakeConditionContext } from "@flixlix-cards/shared/testing/fixtures";
import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";
import {
  type FlowCardPlusConfig,
  type FlowRateModel,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { computeCardState } from "./compute-card-state";
import { energyReadings } from "./readings/energy";
import { powerReadings } from "./readings/power";
import {
  type CardState,
  type CardStateInput,
  type ReadyCardState,
  type ReadyReadings,
} from "./types";

const thinSpace = " ";

const hassWith = (states: Record<string, string> = {}): HomeAssistant => {
  const hass: Partial<HomeAssistant> = {
    localize: (key: string) => key,
    locale: {
      language: "en",
      number_format: NumberFormat.comma_decimal,
      time_format: TimeFormat.language,
    },
    states: Object.fromEntries(
      Object.entries(states).map(([entityId, state]) => [
        entityId,
        {
          entity_id: entityId,
          state,
          attributes: {},
          last_changed: "",
          last_updated: "",
          context: { id: "", user_id: null, parent_id: null },
        },
      ])
    ),
  };
  return hass as HomeAssistant;
};

const noTemplates: TemplatesObj = {
  gridSecondary: undefined,
  solarSecondary: undefined,
  homeSecondary: undefined,
  nonFossilFuelSecondary: undefined,
  auxiliarySecondary: undefined,
  individual: [],
};

type ReadingsOverrides = Partial<Omit<ReadyReadings, "grid" | "solar" | "battery">> & {
  grid?: { fromGrid?: number; toGrid?: number };
  solar?: Partial<ReadyReadings["solar"]>;
  battery?: { toBattery?: number; fromBattery?: number };
};

const readings = (overrides: ReadingsOverrides = {}): ReadyReadings => ({
  status: "ready",
  family: overrides.family ?? "power",
  grid: {
    kind: "split",
    outOf: overrides.grid?.fromGrid ?? 0,
    into: overrides.grid?.toGrid ?? 0,
  },
  solar: { total: 0, secondary: 0, ...overrides.solar },
  battery: {
    kind: "split",
    outOf: overrides.battery?.fromBattery ?? 0,
    into: overrides.battery?.toBattery ?? 0,
  },
  home: overrides.home ?? null,
  generator: overrides.generator ?? null,
  individuals: overrides.individuals ?? [],
  auxiliary: overrides.auxiliary ?? null,
  fossilEnergyConsumption: overrides.fossilEnergyConsumption,
});

const gridEntity = { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } };

const config = (overrides: Partial<FlowCardPlusConfig> = {}): FlowCardPlusConfig => ({
  type: "custom:power-flow-card-plus",
  min_flow_rate: 0.75,
  max_flow_rate: 6,
  max_expected_power: 2000,
  min_expected_power: 0.01,
  clickable_entities: false,
  base_decimals: 0,
  kilo_decimals: 1,
  kilo_threshold: 1000,
  mega_decimals: 1,
  mega_threshold: 1_000_000,
  ...overrides,
  entities: {
    grid: gridEntity,
    solar: { entity: "sensor.solar" },
    battery: { entity: "sensor.battery" },
    ...overrides.entities,
  },
});

const compute = (
  input: Partial<Omit<CardStateInput, "readings">> & { readings?: CardStateInput["readings"] }
) =>
  computeCardState({
    config: config(),
    hass: hassWith(),
    readings: readings(),
    templates: noTemplates,
    conditionContext: fakeConditionContext,
    width: 400,
    ...input,
  });

const ready = (state: CardState): ReadyCardState => {
  if (state.status !== "ready") {
    throw new Error("expected a ready card state");
  }
  return state;
};

const car = (state: ReadyCardState) =>
  state.nodes.individuals.find((individual) => individual.entity === "sensor.car");

const fossilHass = (percentage: string) =>
  hassWith({ "sensor.fossil": percentage, "binary_sensor.outage": "off" });

const withFossil = config({
  entities: { fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} } },
});

/** The non-fossil node of 1000 W grid import with a fossil entity at "30" read as low-carbon. */
const greenShare = (
  state_type: "power" | "percentage",
  fossilEnergyConsumption?: ReadyReadings["fossilEnergyConsumption"]
) =>
  ready(
    compute({
      config: config({
        entities: {
          fossil_fuel_percentage: {
            entity: "sensor.fossil",
            invert_state: true,
            state_type,
            secondary_info: {},
          },
        },
      }),
      hass: fossilHass("30"),
      readings: readings({ grid: { fromGrid: 1000 }, fossilEnergyConsumption }),
    })
  ).nodes.nonFossil;

const energy = (overrides: ReadingsOverrides) => readings({ family: "energy", ...overrides });

const rateConfig = (overrides: Partial<FlowCardPlusConfig> = {}) =>
  config({
    max_expected_power: 100,
    min_expected_power: 0,
    max_flow_rate: 10,
    min_flow_rate: 1,
    ...overrides,
  });
const gridToHome = (fromGrid: number, overrides: Partial<FlowCardPlusConfig> = {}) =>
  ready(compute({ config: rateConfig(overrides), readings: readings({ grid: { fromGrid } }) }))
    .flows.gridToHome.durationSeconds;

const defaultsGridToHome = (fromGrid: number, overrides: Partial<FlowCardPlusConfig> = {}) =>
  ready(compute({ config: config(overrides), readings: readings({ grid: { fromGrid } }) })).flows
    .gridToHome.durationSeconds;
const speedGridToHome = (fromGrid: number, overrides: Partial<FlowCardPlusConfig> = {}) =>
  gridToHome(fromGrid, { flow_rate_model: "speed", ...overrides });
const solarToHome = (overrides: Partial<FlowCardPlusConfig>) =>
  ready(
    compute({
      config: rateConfig(overrides),
      readings: readings({ grid: { fromGrid: 60 }, solar: { total: 20 } }),
    })
  ).flows.solarToHome.durationSeconds;

const gridImportText = (family: "power" | "energy") =>
  ready(compute({ readings: readings({ family, grid: { fromGrid: 300 } }) })).nodes.grid.display
    .fromGrid;

const solarText = (total: number) =>
  ready(compute({ readings: readings({ family: "energy", solar: { total } }) })).nodes.solar
    .display;

const powerSolarText = (total: number, overrides: Partial<FlowCardPlusConfig>, hass = hassWith()) =>
  ready(compute({ config: config(overrides), hass, readings: readings({ solar: { total } }) }))
    .nodes.solar.display;

const idleLine = (mode: NonNullable<FlowCardPlusConfig["display_zero_lines"]>["mode"]) =>
  ready(compute({ config: config({ display_zero_lines: { mode, transparency: 30 } }) })).flows
    .gridToHome;

const individualSecondaryShown = (displayZero: boolean) =>
  ready(
    compute({
      config: config({
        entities: {
          individual: [
            {
              entity: "sensor.ev",
              display_zero: true,
              secondary_info: { entity: "sensor.ev_soc", display_zero: displayZero },
            },
          ],
        },
      }),
      hass: hassWith({ "sensor.ev_soc": "0" }),
      readings: readings({ individuals: [0] }),
    })
  ).nodes.individuals[0]?.secondary.show;

describe("power distribution", () => {
  test("solar feeds home and battery, the grid covers the rest", () => {
    const { nodes } = ready(
      compute({
        config: withFossil,
        hass: fossilHass("30"),
        readings: readings({
          grid: { fromGrid: 600, toGrid: 200 },
          solar: { total: 1000 },
          battery: { fromBattery: 400, toBattery: 300 },
        }),
      })
    );

    expect(nodes.solar.state).toMatchObject({ toHome: 500, toBattery: 300, toGrid: 200 });
    expect(nodes.grid.state).toMatchObject({ toBattery: 0, toHome: 600 });
    expect(nodes.battery.state).toMatchObject({ toGrid: 0, toHome: 400 });
    expect(nodes.nonFossil.state.power).toBeCloseTo(420, 10);
  });

  test("export larger than solar comes from the battery; import home cannot use charges it", () => {
    const { nodes } = ready(
      compute({
        config: withFossil,
        hass: fossilHass("25"),
        readings: readings({
          grid: { fromGrid: 200, toGrid: 600 },
          solar: { total: 500 },
          battery: { fromBattery: 150, toBattery: 200 },
        }),
      })
    );

    expect(nodes.solar.state).toMatchObject({ toHome: 0, toBattery: 50, toGrid: 450 });
    expect(nodes.grid.state).toMatchObject({ toBattery: 150, toHome: 50 });
    expect(nodes.battery.state).toMatchObject({ toGrid: 150, toHome: 0 });
    expect(nodes.nonFossil.state.power).toBe(37.5);
  });

  test("a power outage feeds home from the generator and drops non-fossil", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            grid: {
              ...gridEntity,
              power_outage: { entity: "binary_sensor.outage", icon_alert: "mdi:outage" },
            },
            solar: undefined,
            fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} },
          },
        }),
        hass: hassWith({ "binary_sensor.outage": "on", "sensor.fossil": "50" }),
        readings: readings({
          grid: { fromGrid: 600, toGrid: 200 },
          battery: { fromBattery: 300 },
          generator: 1234,
        }),
      })
    );

    expect(nodes.grid.icon).toBe("mdi:outage");
    expect(nodes.grid.state).toMatchObject({ fromGrid: 1234, toGrid: 0, toHome: 1234 });
    expect(nodes.battery.state.toGrid).toBe(0);
    expect(nodes.nonFossil).toMatchObject({ has: false, hasPercentage: false });
    expect(nodes.nonFossil.state.power).toBeNull();
  });

  test("an outage without a configured alert icon and label shows the defaults", () => {
    const { nodes } = ready(
      compute({ hass: hassWith({ "binary_sensor.outage": "on" }), readings: readings() })
    );

    expect(nodes.grid.icon).toBe("mdi:transmission-tower-off");
    expect(nodes.grid.powerOutage).toMatchObject({ has: true, isOutage: true });
    expect(nodes.grid.powerOutage.name).not.toBe("");
  });

  test("bug #795/#830/#890: solar charging the battery is solar→battery, home stays grid import", () => {
    const { nodes } = ready(
      compute({
        readings: readings({
          grid: { fromGrid: 354 },
          solar: { total: 65 },
          battery: { toBattery: 65 },
        }),
      })
    );

    expect(nodes.solar.state).toMatchObject({ toHome: 0, toBattery: 65 });
    expect(nodes.grid.state).toMatchObject({ toBattery: 0, toHome: 354 });
    expect(nodes.battery.state).toMatchObject({ toGrid: 0, toHome: 0 });
  });

  test("without solar, export comes from the battery", () => {
    const { nodes } = ready(
      compute({
        config: config({ entities: { solar: undefined } }),
        readings: readings({ grid: { fromGrid: 300, toGrid: 90 }, battery: { fromBattery: 160 } }),
      })
    );

    expect(nodes.battery.state).toMatchObject({ toGrid: 90, toHome: 70 });
    expect(nodes.grid.state.toHome).toBe(300);
  });

  test("solar within its zero tolerance does not charge the battery", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: { solar: { entity: "sensor.solar", display_zero_tolerance: 100 } },
        }),
        readings: readings({
          grid: { fromGrid: 100 },
          solar: { total: 50 },
          battery: { toBattery: 10 },
        }),
      })
    );

    expect(nodes.solar.state.toBattery).toBe(0);
  });
});

describe("energy distribution", () => {
  test("splits period totals in energy dashboard order", () => {
    const { nodes } = ready(
      compute({
        readings: energy({
          grid: { fromGrid: 20, toGrid: 4 },
          solar: { total: 18 },
          battery: { fromBattery: 6, toBattery: 7 },
        }),
      })
    );

    expect(nodes.grid.state).toMatchObject({ toBattery: 0, toHome: 20 });
    expect(nodes.solar.state).toMatchObject({ toBattery: 7, toGrid: 4, toHome: 7 });
    expect(nodes.battery.state.toHome).toBe(6);
  });

  test("grid/battery exchange within the larger zero tolerance is dropped", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            grid: { ...gridEntity, display_zero_tolerance: 6 },
            battery: { entity: "sensor.battery", display_zero_tolerance: 6 },
          },
        }),
        readings: energy({
          grid: { fromGrid: 10, toGrid: 5 },
          battery: { fromBattery: 6, toBattery: 2 },
        }),
      })
    );

    expect(nodes.grid.state).toMatchObject({ toBattery: 0, toHome: 10 });
    expect(nodes.battery.state).toMatchObject({ toGrid: 0, toHome: 6 });
  });

  test("non-fossil energy comes from the energy collection's fossil consumption", () => {
    const { nodes } = ready(
      compute({
        config: withFossil,
        hass: fossilHass("40"),
        readings: energy({ grid: { fromGrid: 1000 }, fossilEnergyConsumption: { coal: 0.2 } }),
      })
    );

    expect(nodes.grid.state.toHome).toBe(1000);
    expect(nodes.nonFossil.state.power).toBe(800);
    expect(nodes.nonFossil.display).toBe(`800${thinSpace}Wh`);
  });

  test("an inverted fossil entity is read as the low-carbon share of grid import", () => {
    expect(greenShare("power").state.power).toBeCloseTo(300, 10);
    expect(greenShare("percentage").display).toBe(`30${thinSpace}%`);
    expect(greenShare("power", { coal: 0.2 }).state.power).toBe(800);
  });
});

describe("zero tolerance and display_zero", () => {
  test("a grid below its tolerance with display_zero off is hidden and takes no flows", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: { grid: { ...gridEntity, display_zero: false, display_zero_tolerance: 10 } },
        }),
        readings: readings({ grid: { fromGrid: 8 }, solar: { total: 100 } }),
      })
    );

    expect(nodes.grid.has).toBe(false);
    expect(nodes.grid.state).toMatchObject({ fromGrid: 0, toHome: 0 });
    expect(nodes.grid.display.fromGrid).toBe(`0${thinSpace}W`);
  });

  test("solar with display_zero off is shown only while producing", () => {
    const solarConfig = config({
      entities: { solar: { entity: "sensor.solar", display_zero: false } },
    });
    const solarHas = (total: number) =>
      ready(compute({ config: solarConfig, readings: readings({ solar: { total } }) })).nodes.solar
        .has;

    expect(solarHas(0)).toBe(false);
    expect(solarHas(20)).toBe(true);
  });

  test("an idle battery with display_zero off is hidden", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: { battery: { entity: "sensor.battery", display_zero: false } },
        }),
      })
    );

    expect(nodes.battery.has).toBe(false);
  });

  test("individual devices below their tolerance are hidden unless display_zero is set", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            individual: [
              { entity: "sensor.small", display_zero_tolerance: 10 },
              { entity: "sensor.idle", display_zero: true },
              { entity: "sensor.large", display_zero_tolerance: 10 },
            ],
          },
        }),
        readings: readings({ individuals: [5, 0, 50] }),
      })
    );

    expect(nodes.individuals.map((individual) => individual.entity)).toEqual([
      "sensor.large",
      "sensor.idle",
    ]);
  });

  describe("an individual device with visibility conditions (#332)", () => {
    const carConfig = config({
      entities: {
        home: { entity: "sensor.home", subtract_individual: true },
        individual: [
          {
            entity: "sensor.car",
            display_zero: true,
            visibility: [{ condition: "state", entity: "binary_sensor.car_plugged", state: "on" }],
          },
          { entity: "sensor.heater" },
        ],
      },
    });
    const carState = (plugged: string, carPower: number) =>
      ready(
        compute({
          config: carConfig,
          hass: hassWith({ "binary_sensor.car_plugged": plugged }),
          readings: readings({ grid: { fromGrid: 1000 }, individuals: [carPower, 200] }),
        })
      );

    test("is hidden while they fail: no circle, no flow, nothing subtracted from home", () => {
      const state = carState("off", 300);

      expect(car(state)).toBeUndefined();
      expect(Object.values(state.individualSlots).map((slot) => slot?.node.entity)).toEqual([
        "sensor.heater",
        undefined,
        undefined,
        undefined,
      ]);
      expect(state.flows.individual.map((flow) => flow.value)).toEqual([0, 200]);
      expect(state.homeRing.usageText).toBe(`800${thinSpace}W`);
    });

    test("shows while they hold, even drawing nothing, as display_zero still applies", () => {
      expect(car(carState("on", 300))).toMatchObject({ has: true, state: 300 });
      expect(carState("on", 300).homeRing.usageText).toBe(`500${thinSpace}W`);
      expect(car(carState("on", 0))).toMatchObject({ has: true, state: 0 });
    });

    test("is hidden while the condition's entity is missing", () => {
      const state = ready(
        compute({ config: carConfig, readings: readings({ individuals: [300] }) })
      );

      expect(car(state)).toBeUndefined();
    });
  });
});

describe("home ring", () => {
  test("bug #449: draws a full grid ring, without NaN segments, when nothing is consumed", () => {
    const { homeRing } = ready(compute({}));

    expect(homeRing).toMatchObject({
      battery: 0,
      solar: 0,
      grid: CIRCLE_CIRCUMFERENCE,
      nonFossil: 0,
      largestSource: "grid",
    });
    expect(homeRing.usageText).toBe(`0${thinSpace}W`);
  });

  test("splits the circle by each source's share of home consumption", () => {
    const { homeRing } = ready(
      compute({ readings: readings({ grid: { fromGrid: 300 }, solar: { total: 100 } }) })
    );

    expect(homeRing.solar).toBeCloseTo(CIRCLE_CIRCUMFERENCE / 4, 10);
    expect(homeRing.grid).toBeCloseTo((CIRCLE_CIRCUMFERENCE * 3) / 4, 10);
    expect(homeRing.largestSource).toBe("grid");
    expect(homeRing.usageText).toBe(`400${thinSpace}W`);
  });

  test("subtract_individual leaves the unaccounted consumption", () => {
    const { homeRing } = ready(
      compute({
        config: config({
          entities: {
            home: { entity: "sensor.home", subtract_individual: true },
            individual: [{ entity: "sensor.device" }],
          },
        }),
        readings: readings({ grid: { fromGrid: 300 }, individuals: [120] }),
      })
    );

    expect(homeRing.usageText).toBe(`180${thinSpace}W`);
  });
});

describe("flow durations", () => {
  test.each([
    { fromGrid: 0, seconds: 6 },
    { fromGrid: 500, seconds: 4.6875 },
    { fromGrid: 1000, seconds: 3.375 },
    { fromGrid: 1500, seconds: 2.0625 },
    { fromGrid: 2000, seconds: 0.75 },
    { fromGrid: 3000, seconds: 0.75 },
  ])("default duration model: $fromGrid W takes $seconds s per dot", ({ fromGrid, seconds }) => {
    expect(defaultsGridToHome(fromGrid)).toBeCloseTo(seconds, 2);
  });

  test("duration model: time per dot is linear across the expected power range", () => {
    for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(gridToHome(fraction * 100)).toBeCloseTo(10 - fraction * 9, 10);
    }
  });

  test("duration model: below min_expected_power dots move slower than max_flow_rate", () => {
    expect(gridToHome(10, { min_expected_power: 20 })).toBeCloseTo(10 + (10 * 9) / 80, 10);
  });

  test("speed model: 1000 W takes 1.33 s per dot with the defaults", () => {
    expect(defaultsGridToHome(1000, { flow_rate_model: "speed" })).toBeCloseTo(1.333, 3);
  });

  test("speed model: maps the expected power range linearly onto dot speed, not duration", () => {
    const speed = (fromGrid: number) => 1 / speedGridToHome(fromGrid);
    const slowest = 1 / 10;
    const fastest = 1;

    expect(speedGridToHome(0)).toBe(10);
    expect(speedGridToHome(100)).toBe(1);
    expect(speedGridToHome(101)).toBe(1);
    for (const fraction of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(speed(fraction * 100)).toBeCloseTo(slowest + fraction * (fastest - slowest), 10);
    }
  });

  test("speed model: clamps to max_flow_rate below min_expected_power", () => {
    expect(speedGridToHome(10, { min_expected_power: 20 })).toBe(10);
  });

  test.each(["duration", "speed"] as const)(
    "%s model: more power never moves dots slower",
    (model) => {
      fc.assert(
        fc.property(amount, amount, (a, b) => {
          const [low, high] = [Math.min(a, b), Math.max(a, b)];
          expect(gridToHome(high, { flow_rate_model: model })).toBeLessThanOrEqual(
            gridToHome(low, { flow_rate_model: model })
          );
          expect(gridToHome(high, { flow_rate_model: model })).toBeGreaterThanOrEqual(1);
        }),
        RUNS
      );
    }
  );

  test("speed model: stays within the flow rate range", () => {
    fc.assert(
      fc.property(amount, (value) => {
        expect(speedGridToHome(value)).toBeLessThanOrEqual(10);
        expect(speedGridToHome(value)).toBeGreaterThanOrEqual(1);
      }),
      RUNS
    );
  });

  test("speed model: stays positive and finite when min_flow_rate is 0", () => {
    const duration = speedGridToHome(50, { min_flow_rate: 0 });

    expect(duration).toBeGreaterThan(0);
    expect(Number.isFinite(duration)).toBe(true);
  });

  /** What YAML hands the card for `flow_rate_model: fast`. */
  const unknownModel: FlowRateModel = JSON.parse('"fast"');

  test.each<{ options: Partial<FlowCardPlusConfig>; model: FlowRateModel }>([
    { options: {}, model: "duration" },
    { options: { use_new_flow_rate_model: true }, model: "duration" },
    { options: { use_new_flow_rate_model: false }, model: "relative" },
    { options: { flow_rate_model: "speed" }, model: "speed" },
    { options: { flow_rate_model: "relative" }, model: "relative" },
    { options: { flow_rate_model: "duration", use_new_flow_rate_model: false }, model: "duration" },
    { options: { flow_rate_model: "speed", use_new_flow_rate_model: false }, model: "speed" },
    { options: { flow_rate_model: "relative", use_new_flow_rate_model: true }, model: "relative" },
    { options: { flow_rate_model: unknownModel }, model: "duration" },
    {
      options: { flow_rate_model: unknownModel, use_new_flow_rate_model: false },
      model: "relative",
    },
  ])("$options uses the $model model", ({ options, model }) => {
    const byModel: Record<FlowRateModel, number> = {
      duration: solarToHome({ flow_rate_model: "duration" }),
      speed: solarToHome({ flow_rate_model: "speed" }),
      relative: solarToHome({ flow_rate_model: "relative" }),
    };

    expect(new Set(Object.values(byModel)).size).toBe(3);
    expect(solarToHome(options)).toBe(byModel[model]);
  });

  test("fall back to max_flow_rate when the expected power range is empty", () => {
    expect(gridToHome(50, { min_expected_power: 100 })).toBe(10);
  });

  test("are relative to the total of all flows in the relative model", () => {
    const { flows } = ready(
      compute({
        config: rateConfig({ flow_rate_model: "relative" }),
        readings: readings({ grid: { fromGrid: 75 }, solar: { total: 25 } }),
      })
    );

    expect(flows.solarToHome.durationSeconds).toBeCloseTo(7.75, 10);
  });

  test("individual devices use their own rate unless calculate_flow_rate is off or a number", () => {
    const { flows, individualSlots } = ready(
      compute({
        config: rateConfig({
          entities: {
            individual: [
              { entity: "sensor.a" },
              { entity: "sensor.b", calculate_flow_rate: false },
              { entity: "sensor.c", calculate_flow_rate: 4 },
            ],
          },
        }),
        readings: readings({ individuals: [50, 50, 50] }),
      })
    );
    const calculated = gridToHome(50);

    expect(flows.individual.map((flow) => flow.durationSeconds)).toEqual([calculated, 1.66, 4]);
    expect(individualSlots.leftTop?.flow.durationSeconds).toBe(calculated);
    expect(individualSlots.leftBottom?.flow.durationSeconds).toBe(1.66);
  });

  test("dots stop when disabled or while the page is hidden", () => {
    expect(ready(compute({})).animate).toBe(true);
    expect(ready(compute({ config: config({ disable_dots: true }) })).animate).toBe(false);
    expect(ready(compute({ pageHidden: true })).animate).toBe(false);
  });
});

const order = (state: ReadyCardState) =>
  state.nodes.individuals.map((individual) => individual.entity);

describe("individual device slots", () => {
  const four = config({
    entities: {
      individual: ["a", "b", "c", "d"].map((name) => ({ entity: `sensor.${name}` })),
    },
  });
  const unsorted = { ...four, sort_individual_devices: false };
  const slots = (overrides: Partial<CardStateInput>) =>
    ready(
      compute({ config: four, readings: readings({ individuals: [10, 40, 30, 20] }), ...overrides })
    );

  test("narrow cards show two devices on the left", () => {
    const state = slots({ config: unsorted, width: 358 });

    expect(state.individualSlots.leftTop?.node.entity).toBe("sensor.a");
    expect(state.individualSlots.leftBottom?.node.entity).toBe("sensor.b");
    expect(state.individualSlots.rightTop).toBeUndefined();
    expect(state.layout.hasRightIndividual).toBe(false);
  });

  test("cards at least 359px wide, or allowing layout breaks, show four", () => {
    expect(slots({ config: unsorted, width: 359 }).individualSlots.rightBottom?.node.entity).toBe(
      "sensor.d"
    );
    expect(
      slots({ width: 0, config: { ...four, allow_layout_break: true } }).layout.hasRightIndividual
    ).toBe(true);
  });

  test("devices are sorted by reading, largest first, when sort_individual_devices is unset", () => {
    const sorted = ["sensor.b", "sensor.c", "sensor.d", "sensor.a"];

    expect(order(slots({}))).toEqual(sorted);
    expect(order(slots({ config: { ...four, sort_individual_devices: true } }))).toEqual(sorted);
  });

  test("sort_individual_devices: false keeps the configured order", () => {
    expect(order(slots({ config: unsorted }))).toEqual([
      "sensor.a",
      "sensor.b",
      "sensor.c",
      "sensor.d",
    ]);
  });
});

describe("loading", () => {
  test("an energy card without its growth map is loading", () => {
    const state = compute({
      readings: energyReadings(hassWith(), { ...config(), type: "x" }, undefined),
    });

    expect(state).toEqual({ status: "loading" });
  });
});

describe("display units", () => {
  test("follow the readings' unit family, not the card type", () => {
    expect(gridImportText("power")).toBe(`300${thinSpace}W`);
    expect(gridImportText("energy")).toBe(`300${thinSpace}Wh`);
  });

  test("scale to kilo and mega units", () => {
    expect(solarText(1500)).toBe(`1.5${thinSpace}kWh`);
    expect(solarText(1_500_000)).toBe(`1.5${thinSpace}MWh`);
  });

  test("fall back to the default thresholds and decimals when unset", () => {
    const unset = config({
      kilo_threshold: undefined,
      mega_threshold: undefined,
      base_decimals: undefined,
      kilo_decimals: undefined,
      mega_decimals: undefined,
    });
    const text = (total: number) =>
      ready(compute({ config: unset, readings: readings({ family: "energy", solar: { total } }) }))
        .nodes.solar.display;

    expect(text(999.4)).toBe(`999${thinSpace}Wh`);
    expect(text(1234)).toBe(`1.23${thinSpace}kWh`);
    expect(text(2_345_678)).toBe(`2.35${thinSpace}MWh`);
  });

  test("grid, solar and battery use their own unit, unit white space and decimals", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            grid: {
              ...gridEntity,
              unit_of_measurement: "L/min",
              unit_white_space: false,
              decimals: 1,
            },
            solar: { entity: "sensor.solar", decimals: 2 },
            battery: { entity: "sensor.battery", unit_of_measurement: "L/min" },
          },
        }),
        hass: hassWith({ "binary_sensor.outage": "off" }),
        readings: readings({
          grid: { fromGrid: 2.46 },
          solar: { total: 1234 },
          battery: { fromBattery: 300 },
        }),
      })
    );

    expect(nodes.grid.display.fromGrid).toBe("2.5L/min");
    expect(nodes.solar.display).toBe(`1.23${thinSpace}kW`);
    expect(nodes.battery.display.fromBattery).toBe(`300${thinSpace}L/min`);
  });

  test("an explicit unit keeps the reading unscaled", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            grid: {
              ...gridEntity,
              secondary_info: {
                entity: "sensor.meter",
                unit_of_measurement: "L",
                unit_white_space: false,
              },
            },
          },
        }),
        hass: hassWith({ "sensor.meter": "-2500", "binary_sensor.outage": "off" }),
      })
    );

    expect(nodes.grid.secondary.text).toBe("2,500L");
  });

  test("a reading with an explicit prefixed unit is shown in that unit", () => {
    const state = ready(
      compute({
        config: config({
          entities: {
            grid: { ...gridEntity, unit_of_measurement: "kW" },
            individual: [{ entity: "sensor.heater", unit_of_measurement: "kW" }],
          },
        }),
        hass: hassWith({ "binary_sensor.outage": "off" }),
        readings: readings({ grid: { fromGrid: 1500 }, individuals: [1500] }),
      })
    );

    expect(state.nodes.grid.display.fromGrid).toBe(`1.5${thinSpace}kW`);
    expect(state.nodes.individuals[0]?.displayState).toBe(`1.5${thinSpace}kW`);
  });

  test("an explicit unit on a secondary info keeps the entity's own value", () => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            grid: {
              ...gridEntity,
              secondary_info: { entity: "sensor.today", unit_of_measurement: "kWh", decimals: 1 },
            },
          },
        }),
        hass: hassWith({ "sensor.today": "12.5", "binary_sensor.outage": "off" }),
      })
    );

    expect(nodes.grid.secondary.text).toBe(`12.5${thinSpace}kWh`);
  });

  test("show every configured decimal, also beyond two", () => {
    const watts = { kilo_threshold: 0, kilo_decimals: 3 };

    expect(powerSolarText(2356, watts)).toBe(`2.356${thinSpace}kW`);
    expect(powerSolarText(1560, watts)).toBe(`1.56${thinSpace}kW`);
  });
});

describe("keep_trailing_zeros", () => {
  const keep = { keep_trailing_zeros: true };

  test("pads a value with zeros to the decimals of its scale", () => {
    expect(powerSolarText(1000, keep)).toBe(`1.0${thinSpace}kW`);
    expect(powerSolarText(300, { ...keep, base_decimals: 2 })).toBe(`300.00${thinSpace}W`);
    expect(powerSolarText(2_000_000, { ...keep, mega_decimals: 2 })).toBe(`2.00${thinSpace}MW`);
  });

  test("shows watt-level precision in kW from zero up", () => {
    const watts = { ...keep, kilo_threshold: 0, kilo_decimals: 3 };

    expect(powerSolarText(0, watts)).toBe(`0.000${thinSpace}kW`);
    expect(powerSolarText(392, watts)).toBe(`0.392${thinSpace}kW`);
    expect(powerSolarText(1560, watts)).toBe(`1.560${thinSpace}kW`);
  });

  test("pads to a node's own decimals", () => {
    const solarWithDecimals = { entities: { solar: { entity: "sensor.solar", decimals: 2 } } };

    expect(powerSolarText(1500, { ...keep, ...solarWithDecimals })).toBe(`1.50${thinSpace}kW`);
  });

  test("keeps the locale's decimal separator", () => {
    const hass = hassWith();
    hass.locale = { ...hass.locale, number_format: NumberFormat.decimal_comma };

    expect(powerSolarText(1000, keep, hass)).toBe(`1,0${thinSpace}kW`);
  });

  test("pads without a number format", () => {
    const hass = hassWith();
    hass.locale = { ...hass.locale, number_format: NumberFormat.none };

    expect(powerSolarText(1000, { ...keep, kilo_decimals: 2 }, hass)).toBe(`1.00${thinSpace}kW`);
  });

  test("drops trailing zeros when off", () => {
    expect(powerSolarText(1000, {})).toBe(`1${thinSpace}kW`);
  });
});

describe("zero lines", () => {
  test.each([
    ["show", true, ""],
    ["hide", false, ""],
    ["grey_out", true, "grey"],
    ["transparency", true, "transparency "],
    ["custom", true, "transparency grey"],
  ] as const)("in %s mode are visible=%s with class '%s'", (mode, visible, lineClass) => {
    expect(idleLine(mode)).toMatchObject({ visible, lineClass });
  });

  test("lines carrying a flow are drawn plainly in every mode", () => {
    const { flows } = ready(
      compute({
        config: config({ display_zero_lines: { mode: "hide" } }),
        readings: readings({ grid: { fromGrid: 100 } }),
      })
    );

    expect(flows.gridToHome).toMatchObject({ visible: true, lineClass: "" });
  });

  test("set the fade and grey colour as CSS variables", () => {
    const transparency = ready(
      compute({
        config: config({ display_zero_lines: { mode: "transparency", transparency: 30 } }),
      })
    ).cssVars;
    const grey = ready(
      compute({
        config: config({ display_zero_lines: { mode: "grey_out", grey_color: [1, 2, 3] } }),
      })
    ).cssVars;

    expect(transparency["--transparency-unused-lines"]).toBe("30");
    expect(grey["--greyed-out--line-color"]).toBe("#010203");
  });
});

const cssVarsFor = (
  overrides: Partial<FlowCardPlusConfig>,
  readingsOverrides: ReadingsOverrides = {}
) => ready(compute({ config: config(overrides), readings: readings(readingsOverrides) })).cssVars;

describe("idle circles", () => {
  const charger = { entity: "sensor.charger", display_zero: true, color_idle: "#999999" };

  test("take the node's idle colour while nothing flows", () => {
    const cssVars = cssVarsFor({
      entities: {
        grid: { ...gridEntity, color: { idle: [1, 2, 3] } },
        battery: { entity: "sensor.battery", color: { idle: "#123456" } },
        individual: [charger],
      },
    });

    expect(cssVars["--circle-grid-color"]).toBe("#010203");
    expect(cssVars["--circle-battery-color"]).toBe("#123456");
    expect(cssVars["--circle-individual-left-top-color"]).toBe("#999999");
  });

  test("keep their direction colour while power flows", () => {
    const cssVars = cssVarsFor(
      {
        entities: {
          grid: { ...gridEntity, color: { idle: "#010203" } },
          battery: { entity: "sensor.battery", color: { idle: "#123456" } },
          individual: [charger],
        },
      },
      { grid: { toGrid: 100 }, battery: { fromBattery: 50 }, individuals: [40] }
    );

    expect(cssVars["--circle-grid-color"]).toBe("var(--energy-grid-return-color)");
    expect(cssVars["--circle-battery-color"]).toBe("var(--energy-battery-out-color)");
    expect(cssVars["--circle-individual-left-top-color"]).toBeUndefined();
  });

  test("count readings below the display zero tolerance as idle", () => {
    const cssVars = cssVarsFor(
      {
        entities: {
          grid: { ...gridEntity, display_zero_tolerance: 10, color: { idle: "#010203" } },
        },
      },
      { grid: { fromGrid: 5 } }
    );

    expect(cssVars["--circle-grid-color"]).toBe("#010203");
  });

  test("without an idle colour keep the consumption colour, as before", () => {
    expect(cssVarsFor({})["--circle-grid-color"]).toBe("var(--energy-grid-consumption-color)");
    expect(cssVarsFor({ display_zero_lines: { mode: "grey_out" } })["--circle-grid-color"]).toBe(
      "var(--energy-grid-consumption-color)"
    );
  });

  test.each(["grey_out", "custom"] as const)(
    "with grey_out_circles in %s mode take the greyed-out line colour",
    (mode) => {
      const cssVars = cssVarsFor({
        display_zero_lines: { mode, grey_color: [1, 2, 3], grey_out_circles: true },
        entities: { individual: [{ entity: "sensor.charger", display_zero: true }] },
      });

      expect(cssVars["--greyed-out--line-color"]).toBe("#010203");
      expect(cssVars["--circle-grid-color"]).toBe("var(--greyed-out--line-color)");
      expect(cssVars["--circle-battery-color"]).toBe("var(--greyed-out--line-color)");
      expect(cssVars["--circle-individual-left-top-color"]).toBe("var(--greyed-out--line-color)");
    }
  );

  test("prefer the node's idle colour over grey_out_circles", () => {
    const cssVars = cssVarsFor({
      display_zero_lines: { mode: "grey_out", grey_out_circles: true },
      entities: { grid: { ...gridEntity, color: { idle: "#010203" } } },
    });

    expect(cssVars["--circle-grid-color"]).toBe("#010203");
  });

  test("ignore grey_out_circles when lines are not greyed out", () => {
    const cssVars = cssVarsFor({ display_zero_lines: { mode: "hide", grey_out_circles: true } });

    expect(cssVars["--circle-grid-color"]).toBe("var(--energy-grid-consumption-color)");
  });
});

describe("secondary info", () => {
  test("formats the secondary entity and prefers a rendered template", () => {
    const secondaryConfig = config({
      entities: {
        grid: {
          ...gridEntity,
          secondary_info: { entity: "sensor.price", unit_of_measurement: "€", decimals: 2 },
        },
        home: { entity: "sensor.home", secondary_info: { template: "{{ 1 }}" } },
      },
    });
    const { nodes } = ready(
      compute({
        config: secondaryConfig,
        hass: hassWith({ "sensor.price": "0.31", "binary_sensor.outage": "off" }),
        templates: { ...noTemplates, homeSecondary: "rendered" },
      })
    );

    expect(nodes.grid.secondary).toMatchObject({ show: true, text: `0.31${thinSpace}€` });
    expect(nodes.home.secondary).toMatchObject({ show: true, templateResult: "rendered" });
    expect(nodes.solar.secondary.show).toBe(false);
  });

  test("individual secondary info at 0 is hidden unless display_zero is set", () => {
    expect(individualSecondaryShown(false)).toBe(false);
    expect(individualSecondaryShown(true)).toBe(true);
  });

  test.each([
    ["heating", true, "heating"],
    ["42.4", true, `42${thinSpace}W`],
    ["unavailable", false, `0${thinSpace}W`],
    ["unknown", false, `0${thinSpace}W`],
  ])("an individual secondary state of %s is shown=%s as %s", (state, show, text) => {
    const { nodes } = ready(
      compute({
        config: config({
          entities: {
            individual: [{ entity: "sensor.heat_pump", secondary_info: { entity: "sensor.mode" } }],
          },
        }),
        hass: hassWith({ "sensor.mode": state }),
        readings: readings({ individuals: [500] }),
      })
    );

    expect(nodes.individuals[0]?.secondary).toMatchObject({ show, text });
  });
});

describe("home balance", () => {
  test("a measured home is shown, and its difference to the balanced home is unaccounted", () => {
    const state = ready(
      compute({
        config: config({ entities: { home: { entity: "sensor.home", override_state: true } } }),
        readings: readings({ grid: { fromGrid: 300 }, solar: { total: 100 }, home: 450 }),
      })
    );

    expect(state.homeBalance).toEqual({ balanced: 400, measured: 450, unaccounted: 50 });
    expect(state.homeRing.usageText).toBe(`450${thinSpace}W`);
    expect(state.homeRing.solar + state.homeRing.grid).toBeCloseTo(CIRCLE_CIRCUMFERENCE, 10);
  });

  test("without a measured home nothing is unaccounted", () => {
    const state = ready(compute({ readings: readings({ grid: { fromGrid: 300 } }) }));

    expect(state.homeBalance).toEqual({ balanced: 300, measured: undefined, unaccounted: 0 });
  });
});

const RUNS = { numRuns: 1000, seed: 20261107 };
const amount = fc.oneof(
  fc.constant(0),
  fc.integer({ min: 0, max: 5000 }),
  fc.double({ min: 0, max: 1e6, noNaN: true })
);
const totalsReadings = fc.record({
  grid: fc.record({ fromGrid: amount, toGrid: amount }),
  solar: fc.record({ total: amount }),
  battery: fc.record({ toBattery: amount, fromBattery: amount }),
});

describe("card state properties", () => {
  test("home ring segments always sum to the circumference", () => {
    fc.assert(
      fc.property(totalsReadings, (overrides) => {
        const { homeRing } = ready(
          compute({ config: withFossil, hass: fossilHass("40"), readings: readings(overrides) })
        );
        const segments = [homeRing.battery, homeRing.solar, homeRing.grid, homeRing.nonFossil];
        const sum = segments.reduce((total, segment) => total + segment, 0);
        expect(segments.every((segment) => segment >= 0)).toBe(true);
        expect(sum).toBeCloseTo(CIRCLE_CIRCUMFERENCE, 9);
      }),
      RUNS
    );
  });

  test("power and energy readings with the same totals give the same flows", () => {
    fc.assert(
      fc.property(totalsReadings, (overrides) => {
        const nodes = (family: "power" | "energy") => {
          const state = ready(compute({ readings: readings({ ...overrides, family }) }));
          return [state.nodes.grid.state, state.nodes.solar.state, state.nodes.battery.state];
        };
        expect(nodes("power")).toEqual(nodes("energy"));
      }),
      RUNS
    );
  });
});

const batteryIconAt = (stateOfCharge: string | undefined) =>
  ready(
    compute({
      config: config({
        entities: {
          battery: {
            entity: "sensor.battery",
            state_of_charge: stateOfCharge === undefined ? undefined : "sensor.soc",
          },
        },
      }),
      hass: hassWith(stateOfCharge === undefined ? {} : { "sensor.soc": stateOfCharge }),
    })
  ).nodes.battery.icon;

const solarSecondaryShown = (
  state: string,
  info: { display_zero?: boolean; display_zero_tolerance?: number; accept_negative?: boolean }
) =>
  ready(
    compute({
      config: config({
        entities: {
          solar: { entity: "sensor.solar", secondary_info: { entity: "sensor.x", ...info } },
        },
      }),
      hass: hassWith({ "sensor.x": state }),
    })
  ).nodes.solar.secondary.show;

describe("node details", () => {
  test("the battery icon follows the state of charge", () => {
    expect(batteryIconAt(undefined)).toBe("mdi:battery");
    expect(batteryIconAt("80")).toBe("mdi:battery-high");
    expect(batteryIconAt("50")).toBe("mdi:battery-medium");
    expect(batteryIconAt("20")).toBe("mdi:battery-low");
    expect(batteryIconAt("10")).toBe("mdi:battery-outline");
  });

  test("solar secondary info hides zero and sub-tolerance numbers unless configured", () => {
    expect(solarSecondaryShown("0", {})).toBe(false);
    expect(solarSecondaryShown("0", { display_zero: true })).toBe(true);
    expect(solarSecondaryShown("sunny", {})).toBe(true);
    expect(solarSecondaryShown("5", { display_zero_tolerance: 10 })).toBe(false);
    expect(solarSecondaryShown("-5", { display_zero_tolerance: 10, accept_negative: true })).toBe(
      true
    );
  });

  test("the home icon takes the colour of its largest source", () => {
    const { cssVars } = ready(
      compute({
        config: config({ entities: { home: { entity: "sensor.home", color_icon: true } } }),
        readings: readings({ grid: { fromGrid: 100 }, solar: { total: 300 } }),
      })
    );

    expect(cssVars["--icon-home-color"]).toBe("var(--energy-solar-color)");
  });
});

const individualSecondaryShownAt = (state: string) =>
  ready(
    compute({
      config: config({
        entities: {
          individual: [
            {
              entity: "sensor.ev",
              display_zero: true,
              secondary_info: { entity: "sensor.ev_soc", display_zero_tolerance: 10 },
            },
          ],
        },
      }),
      hass: hassWith({ "sensor.ev_soc": state }),
      readings: readings({ individuals: [0] }),
    })
  ).nodes.individuals[0]?.secondary.show;

test("individual secondary info hides numbers below its tolerance", () => {
  expect(individualSecondaryShownAt("5")).toBe(false);
  expect(individualSecondaryShownAt("50")).toBe(true);
});

const chargerConfig = (sumTotal: boolean) =>
  config({
    entities: {
      home: { entity: "sensor.home", subtract_individual: true },
      individual: [
        {
          entity: "sensor.charger",
          secondary_info: { entity: "sensor.charger_2", sum_total: sumTotal },
        },
      ],
    },
  });
const chargerHass = hassWith({
  "sensor.grid": "9000",
  "sensor.charger": "0",
  "sensor.charger_2": "7200",
  "binary_sensor.outage": "off",
});
const chargerState = (sumTotal: boolean) =>
  ready(
    compute({
      config: chargerConfig(sumTotal),
      hass: chargerHass,
      readings: powerReadings(chargerHass, chargerConfig(sumTotal)),
    })
  );

describe("an individual with secondary_info.sum_total", () => {
  test("shows and flows the summed value while the secondary line keeps its own reading", () => {
    const device = chargerState(true).individualSlots.leftTop;

    expect(device?.node.displayState).toBe(`7.2${thinSpace}kW`);
    expect(device?.flow.visible).toBe(true);
    expect(device?.flow.durationSeconds).toBe(0.75);
    expect(device?.node.secondary.text).toBe(`7${thinSpace}kW`);
  });

  test("is subtracted from the home in full by subtract_individual", () => {
    expect(chargerState(true).homeRing.usageText).toBe(`1.8${thinSpace}kW`);
  });

  test("without sum_total, a device at 0 W is hidden", () => {
    expect(chargerState(false).individualSlots.leftTop).toBeUndefined();
  });
});

const withAuxiliary = (
  auxiliary: NonNullable<FlowCardPlusConfig["entities"]["auxiliary"]>,
  entities: Partial<FlowCardPlusConfig["entities"]> = {}
) => config({ entities: { auxiliary, ...entities } });
const flowing = readings({
  grid: { fromGrid: 600 },
  solar: { total: 1000 },
  battery: { toBattery: 300 },
  auxiliary: 450,
});
const auxiliaryState = (cardConfig: FlowCardPlusConfig, cardReadings = flowing) =>
  ready(compute({ config: cardConfig, readings: cardReadings }));

const auxiliaryLine = (connect_to?: "grid" | "battery" | "none") =>
  auxiliaryState(withAuxiliary({ entity: "sensor.gas", connect_to })).flows.auxiliary.visible;

describe("the auxiliary node", () => {
  test("is display-only: flows, home and home ring do not change with it", () => {
    const without = auxiliaryState(config());
    const withIt = auxiliaryState(withAuxiliary({ entity: "sensor.gas" }));

    expect(withIt.nodes.auxiliary.displayState).toBe(`450${thinSpace}W`);
    expect(withIt.homeBalance).toEqual(without.homeBalance);
    expect(withIt.homeRing).toEqual(without.homeRing);
    expect({ ...withIt.flows, auxiliary: undefined }).toEqual({
      ...without.flows,
      auxiliary: undefined,
    });
  });

  test("connects to the grid unless connect_to picks the battery or no line", () => {
    expect(auxiliaryLine()).toBe(true);
    expect(auxiliaryLine("grid")).toBe(true);
    expect(auxiliaryLine("battery")).toBe(true);
    expect(auxiliaryLine("none")).toBe(false);
  });

  test("hides the grid's label while its line runs up into the grid", () => {
    const gridLabel = (connect_to?: "grid" | "battery" | "none") =>
      auxiliaryState(withAuxiliary({ entity: "sensor.gas", connect_to })).layout.showGridLabel;

    expect(gridLabel()).toBe(false);
    expect(gridLabel("battery")).toBe(true);
    expect(gridLabel("none")).toBe(true);
    expect(auxiliaryState(config()).layout.showGridLabel).toBe(true);
  });

  test("draws no line while the node it connects to is hidden", () => {
    const state = auxiliaryState(
      withAuxiliary({ entity: "sensor.gas", connect_to: "battery" }, { battery: undefined })
    );

    expect(state.nodes.auxiliary.has).toBe(true);
    expect(state.flows.auxiliary.visible).toBe(false);
  });

  test("keeps the left column and the bottom row without a grid or battery", () => {
    const { layout } = auxiliaryState(
      withAuxiliary(
        { entity: "sensor.gas", connect_to: "none" },
        { grid: undefined, battery: undefined }
      )
    );

    expect(layout.hasGridColumn).toBe(true);
    expect(layout.showBottomRow).toBe(true);
  });

  test("a negative reading with accept_negative flows towards the node it connects to", () => {
    const state = auxiliaryState(
      withAuxiliary({ entity: "sensor.virtual_battery", accept_negative: true }),
      readings({ grid: { fromGrid: 600 }, auxiliary: -450 })
    );

    expect(state.nodes.auxiliary.invertAnimation).toBe(true);
    expect(state.nodes.auxiliary.displayState).toBe(`-450${thinSpace}W`);
    expect(state.flows.auxiliary.value).toBe(450);
  });

  test("below its tolerance it is hidden unless display_zero is set", () => {
    const idle = readings({ grid: { fromGrid: 600 }, auxiliary: 4 });
    const field = { entity: "sensor.gas", display_zero_tolerance: 5 };

    expect(auxiliaryState(withAuxiliary(field), idle).nodes.auxiliary.has).toBe(false);
    expect(
      auxiliaryState(withAuxiliary({ ...field, display_zero: true }), idle).nodes.auxiliary.has
    ).toBe(true);
  });

  test("reads its entity's power", () => {
    const hass = hassWith({ "sensor.gas": "1200", "binary_sensor.outage": "off" });
    const cardConfig = withAuxiliary({ entity: "sensor.gas" });
    const state = ready(
      compute({ config: cardConfig, hass, readings: powerReadings(hass, cardConfig) })
    );

    expect(state.nodes.auxiliary.displayState).toBe(`1.2${thinSpace}kW`);
  });
});
