import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";
import { type FlowCardPlusConfig, type TemplatesObj } from "@flixlix-cards/shared/types";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { computeCardState } from "./compute-card-state";
import { energyReadings } from "./readings/energy";
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
  individual: [],
};

type ReadingsOverrides = Partial<Omit<ReadyReadings, "grid" | "solar" | "battery">> & {
  grid?: Partial<ReadyReadings["grid"]>;
  solar?: Partial<ReadyReadings["solar"]>;
  battery?: Partial<ReadyReadings["battery"]>;
};

const readings = (overrides: ReadingsOverrides = {}): ReadyReadings => ({
  status: "ready",
  family: overrides.family ?? "power",
  grid: { fromGrid: 0, toGrid: 0, ...overrides.grid },
  solar: { total: 0, secondary: 0, ...overrides.solar },
  battery: { toBattery: 0, fromBattery: 0, ...overrides.battery },
  home: overrides.home ?? null,
  generator: overrides.generator ?? null,
  individuals: overrides.individuals ?? [],
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
  input: Partial<Omit<CardStateInput, "readings">> & { readings?: CardStateInput["readings"] },
  previous?: CardState
) =>
  computeCardState(
    {
      config: config(),
      hass: hassWith(),
      readings: readings(),
      templates: noTemplates,
      width: 400,
      ...input,
    },
    previous
  );

const ready = (state: CardState): ReadyCardState => {
  if (state.status !== "ready") {
    throw new Error("expected a ready card state");
  }
  return state;
};

const fossilHass = (percentage: string) =>
  hassWith({ "sensor.fossil": percentage, "binary_sensor.outage": "off" });

const withFossil = config({
  entities: { fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} } },
});

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

const at = (fromGrid: number) => ({
  config: config({
    max_expected_power: 100,
    min_expected_power: 0,
    max_flow_rate: 10,
    min_flow_rate: 1,
  }),
  readings: readings({ grid: { fromGrid } }),
});

const withGridDuration = (state: ReadyCardState, durationSeconds: number): ReadyCardState => ({
  ...state,
  flows: { ...state.flows, gridToHome: { ...state.flows.gridToHome, durationSeconds } },
});

const gridImportText = (family: "power" | "energy") =>
  ready(compute({ readings: readings({ family, grid: { fromGrid: 300 } }) })).nodes.grid.display
    .fromGrid;

const solarText = (total: number) =>
  ready(compute({ readings: readings({ family: "energy", solar: { total } }) })).nodes.solar
    .display;

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

  test("export larger than solar charges the battery from the grid", () => {
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

    expect(nodes.solar.state).toMatchObject({ toHome: 0, toGrid: 600 });
    expect(nodes.grid.state).toMatchObject({ toBattery: 200, toHome: 0 });
    expect(nodes.battery.state.toGrid).toBe(0);
    expect(nodes.nonFossil.state.power).toBe(0);
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
      "sensor.idle",
      "sensor.large",
    ]);
  });
});

describe("home ring", () => {
  test("has no NaN segments when nothing is consumed", () => {
    const { homeRing } = ready(compute({}));

    expect(homeRing).toMatchObject({ battery: 0, solar: 0, grid: 0, nonFossil: 0 });
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
  test("map the expected power range linearly onto the flow rate range", () => {
    expect(gridToHome(0)).toBe(10);
    expect(gridToHome(50)).toBeCloseTo(5.5, 10);
    expect(gridToHome(100)).toBe(1);
    expect(gridToHome(101)).toBe(1);
  });

  test("fall back to max_flow_rate when the expected power range is empty", () => {
    expect(gridToHome(50, { min_expected_power: 100 })).toBe(10);
  });

  test("are relative to the total of all flows in the old model", () => {
    const { flows } = ready(
      compute({
        config: rateConfig({ use_new_flow_rate_model: false }),
        readings: readings({ grid: { fromGrid: 75 }, solar: { total: 25 } }),
      })
    );

    expect(flows.solarToHome.durationSeconds).toBeCloseTo(7.75, 10);
  });

  test("individual devices use their own rate unless calculate_flow_rate is off", () => {
    const { flows, individualSlots } = ready(
      compute({
        config: rateConfig({
          entities: {
            individual: [
              { entity: "sensor.a" },
              { entity: "sensor.b", calculate_flow_rate: false },
            ],
          },
        }),
        readings: readings({ individuals: [50, 50] }),
      })
    );

    expect(flows.individual.map((flow) => flow.durationSeconds)).toEqual([5.5, 1.66]);
    expect(individualSlots.leftTop?.flow.durationSeconds).toBe(5.5);
    expect(individualSlots.leftBottom?.flow.durationSeconds).toBe(1.66);
  });

  test("dots stop when disabled or while the page is hidden", () => {
    expect(ready(compute({})).animate).toBe(true);
    expect(ready(compute({ config: config({ disable_dots: true }) })).animate).toBe(false);
    expect(ready(compute({ pageHidden: true })).animate).toBe(false);
  });
});

describe("animation rescale", () => {
  test("is the new/previous ratio for flows whose duration changed", () => {
    const previous = compute(at(0));
    const { animationRescale } = ready(compute(at(50), previous));

    expect(animationRescale).toEqual({ gridToHome: 0.55 });
  });

  test("is empty without a previous state or when the previous duration is unusable", () => {
    const previous = ready(compute(at(0)));

    expect(ready(compute(at(50))).animationRescale).toEqual({});
    expect(ready(compute(at(50), withGridDuration(previous, 0))).animationRescale).toEqual({});
    expect(ready(compute(at(50), withGridDuration(previous, Number.NaN))).animationRescale).toEqual(
      {}
    );
  });

  test("is empty while dots are not animated", () => {
    const previous = compute(at(0));

    expect(ready(compute({ ...at(50), pageHidden: true }, previous)).animationRescale).toEqual({});
  });
});

describe("individual device slots", () => {
  const four = config({
    entities: {
      individual: ["a", "b", "c", "d"].map((name) => ({ entity: `sensor.${name}` })),
    },
  });
  const slots = (overrides: Partial<CardStateInput>) =>
    ready(
      compute({ config: four, readings: readings({ individuals: [10, 40, 30, 20] }), ...overrides })
    );

  test("narrow cards show two devices on the left", () => {
    const state = slots({ width: 358 });

    expect(state.individualSlots.leftTop?.node.entity).toBe("sensor.a");
    expect(state.individualSlots.leftBottom?.node.entity).toBe("sensor.b");
    expect(state.individualSlots.rightTop).toBeUndefined();
    expect(state.layout.hasRightIndividual).toBe(false);
  });

  test("cards at least 359px wide, or allowing layout breaks, show four", () => {
    expect(slots({ width: 359 }).individualSlots.rightBottom?.node.entity).toBe("sensor.d");
    expect(
      slots({ width: 0, config: { ...four, allow_layout_break: true } }).layout.hasRightIndividual
    ).toBe(true);
  });

  test("sort_individual_devices orders by reading, largest first", () => {
    const state = slots({ config: { ...four, sort_individual_devices: true } });

    expect(state.nodes.individuals.map((individual) => individual.entity)).toEqual([
      "sensor.b",
      "sensor.c",
      "sensor.d",
      "sensor.a",
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
});
