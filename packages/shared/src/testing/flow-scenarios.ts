import { type FlowCardPlusConfig } from "../types";
import { sensor, type StateFixtures } from "../preview/fake-hass";

/** What a mounted flow card must show; selectors are queried in the card's shadow root. */
export type FlowExpectation = {
  /** Whitespace-collapsed text per selector, with units as the power card shows them (W, kW). */
  text?: Record<string, string>;
  /** Selectors that must match: nodes, flow lines, dots (`.flow-dot[data-path=<line>] circle`), individual slots. */
  shown?: string[];
  /** Selectors that must not match. */
  hidden?: string[];
  /** Class tokens per selector, e.g. how a zero line is drawn. */
  classes?: Record<string, string[]>;
  /** Flow dot selectors from fastest to slowest; larger flows move faster. */
  fastestFirst?: string[];
};

export type FlowScenario = {
  name: string;
  entities: FlowCardPlusConfig["entities"];
  options?: Partial<FlowCardPlusConfig>;
  /** Live power states; the energy card reads the same numbers as Wh growth over the period. */
  states: StateFixtures;
  templates?: Record<string, string>;
  width?: number;
  /** Also run on the energy card. */
  energy?: boolean;
  /** Also compared against a screenshot baseline (`pnpm test:visual`). */
  visual?: boolean;
  expect: FlowExpectation;
};

const flows = {
  solarToHome: "#solar-home-flow",
  solarToGrid: "#solar-grid-flow",
  solarToBattery: "#solar-battery-flow",
  gridToHome: "#grid-home-flow",
  batteryToHome: "#battery-home-flow",
  batteryGrid: "#battery-grid-flow",
} as const;

/** Each flow's line path, which its dots name in `data-path`. */
const linePaths: Record<string, string> = {
  [flows.solarToHome]: "solar",
  [flows.solarToGrid]: "return",
  [flows.solarToBattery]: "battery-solar",
  [flows.gridToHome]: "grid",
  [flows.batteryToHome]: "battery-home",
  [flows.batteryGrid]: "battery-grid",
};

const dot = (flow: string) => `.flow-dot[data-path="${linePaths[flow]}"] circle`;

const nodes = {
  grid: ".circle-container.grid",
  solar: ".circle-container.solar",
  battery: ".circle-container.battery",
  home: ".circle-container.home",
};

const allFlowDots = Object.values(flows).map(dot);

const splitEntities: FlowCardPlusConfig["entities"] = {
  grid: { entity: { consumption: "sensor.grid_import", production: "sensor.grid_export" } },
  solar: { entity: "sensor.solar" },
  battery: {
    entity: { consumption: "sensor.battery_discharge", production: "sensor.battery_charge" },
  },
};

const combinedEntities = {
  grid: { entity: "sensor.grid" },
  solar: { entity: "sensor.solar" },
  battery: { entity: "sensor.battery", state_of_charge: "sensor.battery_soc" },
} satisfies FlowCardPlusConfig["entities"];

const individuals = (count: number): FlowCardPlusConfig["entities"]["individual"] =>
  Array.from({ length: count }, (_, index) => ({
    entity: `sensor.device_${index + 1}`,
    name: `Device ${index + 1}`,
  }));

const individualStates = (count: number): StateFixtures =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `sensor.device_${index + 1}`,
      `${(index + 1) * 10}`,
    ])
  );

export const flowScenarios: FlowScenario[] = [
  {
    name: "auxiliary feeding the grid",
    visual: true,
    energy: true,
    entities: {
      ...combinedEntities,
      auxiliary: {
        entity: "sensor.wind_stake",
        name: "Wind stake",
        icon: "mdi:wind-turbine",
        inverted_animation: true,
      },
    },
    states: {
      "sensor.grid": "800",
      "sensor.solar": "1200",
      "sensor.battery": "-300",
      "sensor.battery_soc": "60",
      "sensor.wind_stake": "350",
    },
    expect: {
      text: { "span.auxiliary": "350 W", ".circle-container.auxiliary .label": "Wind stake" },
      shown: [
        ".circle-container.auxiliary",
        "#auxiliary-flow",
        '.flow-dot[data-path="auxiliary-line"] circle',
      ],
    },
  },
  {
    name: "auxiliary connected to the battery",
    visual: true,
    entities: {
      ...combinedEntities,
      auxiliary: { entity: "sensor.dc_solar", name: "DC solar", connect_to: "battery" },
    },
    states: {
      "sensor.grid": "200",
      "sensor.solar": "900",
      "sensor.battery": "-500",
      "sensor.battery_soc": "45",
      "sensor.dc_solar": "400",
    },
    expect: {
      shown: [".circle-container.auxiliary", "#auxiliary-flow"],
    },
  },
  {
    name: "auxiliary without a line and without a battery",
    visual: true,
    entities: {
      grid: { entity: "sensor.grid" },
      solar: { entity: "sensor.solar" },
      auxiliary: {
        entity: "sensor.gas",
        name: "Gas",
        icon: "mdi:fire",
        connect_to: "none",
        unit_of_measurement: "m³",
        decimals: 2,
      },
    },
    states: {
      "sensor.grid": "300",
      "sensor.solar": "500",
      "sensor.gas": sensor("1.25", { unit: "m³" }),
    },
    expect: {
      text: { "span.auxiliary": "1.25 m³" },
      shown: [".circle-container.auxiliary"],
      hidden: ["#auxiliary-flow"],
    },
  },
  {
    name: "all zero",
    visual: true,
    entities: combinedEntities,
    states: {
      "sensor.grid": "0",
      "sensor.solar": "0",
      "sensor.battery": "0",
      "sensor.battery_soc": "0",
    },
    energy: true,
    expect: {
      text: { ".grid .consumption": "0 W", ".solar .solar": "0 W", ".home span.home": "0 W" },
      shown: [nodes.grid, nodes.solar, nodes.battery, nodes.home],
      hidden: allFlowDots,
    },
  },
  {
    name: "keep_trailing_zeros",
    entities: combinedEntities,
    options: { keep_trailing_zeros: true, kilo_threshold: 0, kilo_decimals: 3 },
    states: {
      "sensor.grid": "0",
      "sensor.solar": "1560",
      "sensor.battery": "0",
      "sensor.battery_soc": "0",
    },
    energy: true,
    expect: {
      text: { ".grid .consumption": "0.000 kW", ".solar .solar": "1.560 kW" },
    },
  },
  {
    name: "solar exporting",
    visual: true,
    entities: combinedEntities,
    states: {
      "sensor.grid": "-300",
      "sensor.solar": "1000",
      "sensor.battery": "0",
      "sensor.battery_soc": "80",
    },
    expect: {
      text: { ".grid .return": "300 W", ".solar .solar": "1 kW", ".home span.home": "700 W" },
      shown: [dot(flows.solarToHome), dot(flows.solarToGrid)],
      hidden: [dot(flows.gridToHome), dot(flows.batteryToHome), dot(flows.solarToBattery)],
      fastestFirst: [dot(flows.solarToHome), dot(flows.solarToGrid)],
    },
  },
  {
    name: "solar charging the battery without a grid",
    visual: true,
    entities: { solar: combinedEntities.solar, battery: combinedEntities.battery },
    states: {
      "sensor.solar": "1000",
      "sensor.battery": "-300",
      "sensor.battery_soc": "60",
    },
    expect: {
      text: {
        ".solar .solar": "1 kW",
        ".battery .battery-in": "300 W",
        ".home span.home": "700 W",
      },
      shown: [dot(flows.solarToHome), dot(flows.solarToBattery)],
      hidden: [nodes.grid, dot(flows.batteryToHome)],
    },
  },
  {
    name: "battery charging from the grid",
    entities: combinedEntities,
    states: {
      "sensor.grid": "800",
      "sensor.solar": "0",
      "sensor.battery": "-500",
      "sensor.battery_soc": "40",
    },
    expect: {
      text: {
        ".grid .consumption": "800 W",
        ".battery .battery-in": "500 W",
        ".home span.home": "300 W",
      },
      shown: [`${dot(flows.batteryGrid)}.battery-from-grid`, dot(flows.gridToHome)],
      hidden: [`${dot(flows.batteryGrid)}.battery-to-grid`, dot(flows.batteryToHome)],
      fastestFirst: [`${dot(flows.batteryGrid)}.battery-from-grid`, dot(flows.gridToHome)],
    },
  },
  {
    name: "battery discharging to the grid",
    entities: combinedEntities,
    states: {
      "sensor.grid": "-400",
      "sensor.solar": "0",
      "sensor.battery": "600",
      "sensor.battery_soc": "90",
    },
    expect: {
      text: {
        ".grid .return": "400 W",
        ".battery .battery-out": "600 W",
        ".home span.home": "200 W",
      },
      shown: [`${dot(flows.batteryGrid)}.battery-to-grid`, dot(flows.batteryToHome)],
      hidden: [`${dot(flows.batteryGrid)}.battery-from-grid`, dot(flows.gridToHome)],
      fastestFirst: [`${dot(flows.batteryGrid)}.battery-to-grid`, dot(flows.batteryToHome)],
    },
  },
  {
    name: "grid outage with a generator",
    visual: true,
    entities: {
      grid: {
        entity: "sensor.grid",
        power_outage: {
          entity: "binary_sensor.grid_outage",
          state_alert: "on",
          entity_generator: "sensor.generator",
        },
      },
      solar: { entity: "sensor.solar" },
    },
    states: {
      "sensor.grid": "0",
      "binary_sensor.grid_outage": sensor("on", { unit: undefined }),
      "sensor.generator": "400",
      "sensor.solar": "100",
    },
    expect: {
      text: { ".grid .consumption": "400 W", ".home span.home": "500 W" },
      shown: [dot(flows.gridToHome), dot(flows.solarToHome)],
      hidden: [".grid .return", ".grid.power-outage"],
    },
  },
  {
    name: "grid outage without a generator",
    entities: {
      grid: {
        entity: "sensor.grid",
        power_outage: {
          entity: "binary_sensor.grid_outage",
          state_alert: "on",
          label_alert: "Outage",
        },
      },
      solar: { entity: "sensor.solar" },
    },
    states: {
      "sensor.grid": "250",
      "binary_sensor.grid_outage": sensor("on", { unit: undefined }),
      "sensor.solar": "100",
    },
    expect: {
      text: { ".grid.power-outage": "Outage", ".home span.home": "100 W" },
      hidden: [".grid .consumption", dot(flows.gridToHome)],
    },
  },
  {
    name: "grid outage in a custom alert colour",
    visual: true,
    entities: {
      grid: {
        entity: "sensor.grid",
        power_outage: {
          entity: "binary_sensor.grid_outage",
          label_alert: "Outage",
          color_alert: "#db4437",
        },
      },
      solar: { entity: "sensor.solar" },
    },
    states: {
      "sensor.grid": "250",
      "binary_sensor.grid_outage": sensor("on", { unit: undefined }),
      "sensor.solar": "100",
    },
    expect: {
      text: { ".grid.power-outage": "Outage", "#home-circle": "100 W" },
      hidden: [".grid .consumption", dot(flows.gridToHome)],
    },
  },
  {
    name: "readings within the zero tolerance",
    entities: {
      grid: { entity: "sensor.grid", display_zero_tolerance: 5 },
      solar: { entity: "sensor.solar", display_zero_tolerance: 20 },
    },
    states: { "sensor.grid": "3", "sensor.solar": "15" },
    expect: {
      text: { ".grid .consumption": "0 W", ".solar .solar": "0 W", ".home span.home": "0 W" },
      hidden: allFlowDots,
    },
  },
  {
    name: "grid import within the zero tolerance hides non-fossil",
    entities: {
      grid: { entity: "sensor.grid", display_zero_tolerance: 20 },
      fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} },
    },
    states: { "sensor.grid": "12", "sensor.fossil": sensor("40", { unit: "%" }) },
    energy: true,
    expect: {
      text: { ".grid .consumption": "0 W" },
      hidden: [".circle-container.low-carbon", dot(flows.gridToHome)],
    },
  },
  {
    name: "display_zero false hides idle nodes",
    entities: {
      grid: { entity: "sensor.grid" },
      solar: { entity: "sensor.solar", display_zero: false },
      battery: { entity: "sensor.battery", display_zero: false },
    },
    states: { "sensor.grid": "300", "sensor.solar": "0", "sensor.battery": "0" },
    expect: {
      text: { ".grid .consumption": "300 W", ".home span.home": "300 W" },
      shown: [nodes.grid, dot(flows.gridToHome)],
      hidden: [nodes.solar, nodes.battery, flows.solarToHome, flows.batteryToHome],
    },
  },
  {
    name: "a negative individual",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: [{ entity: "sensor.device_1", name: "EV" }],
    },
    states: { "sensor.grid": "500", "sensor.device_1": "-50" },
    expect: {
      text: { "span.individual-left-top": "50 W", ".individual-top .label": "EV" },
      shown: [".individual-top .circle"],
    },
  },
  {
    name: "unavailable sensors",
    entities: { ...combinedEntities, individual: individuals(1) },
    states: {
      "sensor.grid": sensor("unavailable"),
      "sensor.solar": sensor("unknown"),
      "sensor.battery": "200",
      "sensor.battery_soc": sensor("unavailable", { unit: "%" }),
      "sensor.device_1": sensor("unavailable"),
    },
    expect: {
      text: { ".battery .battery-out": "200 W", ".home span.home": "200 W" },
      shown: [dot(flows.batteryToHome)],
      hidden: [dot(flows.gridToHome), dot(flows.solarToHome)],
    },
  },
  {
    name: "five sorted individuals on a wide card fill four slots",
    visual: true,
    entities: {
      grid: { entity: "sensor.grid" },
      battery: { entity: "sensor.battery" },
      individual: individuals(5),
    },
    options: { sort_individual_devices: true },
    states: { "sensor.grid": "200", "sensor.battery": "0", ...individualStates(5) },
    width: 500,
    expect: {
      text: {
        "span.individual-left-top": "50 W",
        "span.individual-left-bottom": "40 W",
        "span.individual-right-top": "30 W",
        "span.individual-right-bottom": "20 W",
      },
      shown: [
        ".individual-right-top",
        ".individual-right-bottom",
        "#individual-top-right-home-flow",
      ],
    },
  },
  {
    name: "five individuals on a narrow card fill two slots",
    visual: true,
    entities: {
      grid: { entity: "sensor.grid" },
      battery: { entity: "sensor.battery" },
      individual: individuals(5),
    },
    options: { sort_individual_devices: false },
    states: { "sensor.grid": "200", "sensor.battery": "0", ...individualStates(5) },
    width: 340,
    expect: {
      text: { "span.individual-left-top": "10 W", "span.individual-left-bottom": "20 W" },
      hidden: [
        ".individual-right-top",
        ".individual-right-bottom",
        "#individual-top-right-home-flow",
      ],
    },
  },
  {
    name: "individuals are sorted by power across W and kW by default",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: [
        { entity: "sensor.lights", name: "Lights" },
        { entity: "sensor.charger", name: "Charger" },
      ],
    },
    states: {
      "sensor.grid": "4000",
      "sensor.lights": "20.63",
      "sensor.charger": sensor("3.848", { unit: "kW" }),
    },
    expect: {
      text: { ".individual-top .label": "Charger", ".individual-bottom .label": "Lights" },
    },
  },
  {
    name: "split grid and battery entities",
    entities: splitEntities,
    states: {
      "sensor.grid_import": "0",
      "sensor.grid_export": "250",
      "sensor.solar": "400",
      "sensor.battery_discharge": "0",
      "sensor.battery_charge": "0",
    },
    energy: true,
    expect: {
      text: { ".grid .return": "250 W", ".home span.home": "150 W" },
      shown: [dot(flows.solarToGrid), dot(flows.solarToHome)],
      hidden: [dot(flows.gridToHome)],
    },
  },
  {
    name: "invert_state flips a reading",
    entities: {
      grid: { entity: "sensor.grid", invert_state: true },
      solar: { entity: "sensor.solar" },
    },
    states: { "sensor.grid": "-500", "sensor.solar": "0" },
    expect: {
      text: { ".grid .consumption": "500 W", ".home span.home": "500 W" },
      shown: [dot(flows.gridToHome)],
    },
  },
  {
    name: "kW and MW sensors",
    entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.solar" } },
    states: {
      "sensor.grid": sensor("1.5", { unit: "kW" }),
      "sensor.solar": sensor("0.002", { unit: "MW" }),
    },
    expect: {
      text: {
        ".grid .consumption": "1.5 kW",
        ".solar .solar": "2 kW",
        ".home span.home": "3.5 kW",
      },
    },
  },
  {
    name: "an explicit kW unit shows kW readings in kW",
    entities: {
      grid: { entity: "sensor.grid", unit_of_measurement: "kW", decimals: 1 },
      individual: [{ entity: "sensor.heater", name: "Heater", unit_of_measurement: "kW" }],
    },
    states: {
      "sensor.grid": sensor("1.5", { unit: "kW" }),
      "sensor.heater": sensor("1.2", { unit: "kW" }),
    },
    expect: {
      text: { ".grid .consumption": "1.5 kW", "span.individual-left-top": "1.2 kW" },
    },
  },
  {
    name: "a water meter in m³ is not scaled",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: [{ entity: "sensor.water", name: "Water", unit_of_measurement: "m³" }],
    },
    states: { "sensor.grid": "100", "sensor.water": sensor("348.9", { unit: "m³" }) },
    expect: { text: { "span.individual-left-top": "349 m³" } },
  },
  {
    name: "grid, solar and battery with their own unit, white space and decimals",
    entities: {
      grid: {
        entity: "sensor.grid",
        unit_of_measurement: "L/min",
        unit_white_space: false,
        decimals: 1,
      },
      solar: { entity: "sensor.solar", decimals: 2 },
      battery: { entity: "sensor.battery", unit_of_measurement: "L/min" },
    },
    states: { "sensor.grid": "2.46", "sensor.solar": "1234", "sensor.battery": "300" },
    expect: {
      text: {
        ".grid .consumption": "2.5L/min",
        ".solar .solar": "1.23 kW",
        ".battery .battery-out": "300 L/min",
      },
    },
  },
  {
    name: "secondary info from an entity and a template",
    visual: true,
    entities: {
      grid: {
        entity: "sensor.grid",
        secondary_info: { entity: "sensor.price", unit_of_measurement: "€/kWh", decimals: 2 },
      },
      solar: { entity: "sensor.solar" },
      home: { entity: "sensor.home", secondary_info: { template: "{{ states('sensor.cost') }}" } },
    },
    states: {
      "sensor.grid": "300",
      "sensor.solar": "0",
      "sensor.home": "300",
      "sensor.price": sensor("0.31", { unit: "€/kWh" }),
    },
    templates: { "{{ states('sensor.cost') }}": "1.20 €" },
    expect: {
      text: { ".grid .secondary-info": "0.31 €/kWh", ".home .secondary-info": "1.20 €" },
    },
  },
  {
    name: "an individual's text secondary info",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: [
        {
          entity: "sensor.heat_pump",
          name: "Heat pump",
          secondary_info: { entity: "sensor.heat_pump_mode" },
        },
      ],
    },
    states: {
      "sensor.grid": "500",
      "sensor.heat_pump": "500",
      "sensor.heat_pump_mode": sensor("heating", { unit: undefined }),
    },
    expect: { text: { ".individual-top .secondary-info": "heating" } },
  },
  {
    name: "an individual summing its secondary entity with sum_total",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: [
        {
          entity: "sensor.charger",
          name: "Charger",
          secondary_info: { entity: "sensor.charger_2", sum_total: true },
        },
      ],
    },
    states: { "sensor.grid": "7200", "sensor.charger": "0", "sensor.charger_2": "7200" },
    energy: true,
    expect: {
      text: { "span.individual-left-top": "7.2 kW", ".individual-top .label": "Charger" },
      shown: ['.flow-dot[data-path="individual-top"] circle'],
    },
  },
  {
    name: "zero lines greyed out",
    visual: true,
    entities: combinedEntities,
    options: { display_zero_lines: { mode: "grey_out" } },
    states: {
      "sensor.grid": "300",
      "sensor.solar": "0",
      "sensor.battery": "0",
      "sensor.battery_soc": "50",
    },
    expect: {
      classes: {
        [`${flows.solarToHome} path`]: ["grey"],
        [`${flows.batteryToHome} path`]: ["grey"],
      },
      shown: [dot(flows.gridToHome)],
    },
  },
  {
    name: "zero lines faded",
    entities: combinedEntities,
    options: { display_zero_lines: { mode: "transparency", transparency: 80 } },
    states: {
      "sensor.grid": "300",
      "sensor.solar": "0",
      "sensor.battery": "0",
      "sensor.battery_soc": "50",
    },
    expect: {
      classes: { [`${flows.solarToHome} path`]: ["transparency"] },
      shown: [dot(flows.gridToHome)],
    },
  },
  {
    name: "zero lines hidden",
    entities: combinedEntities,
    options: { display_zero_lines: { mode: "hide" } },
    states: {
      "sensor.grid": "300",
      "sensor.solar": "0",
      "sensor.battery": "0",
      "sensor.battery_soc": "50",
    },
    expect: {
      shown: [flows.gridToHome],
      hidden: [flows.solarToHome, flows.batteryToHome, flows.solarToBattery, flows.batteryGrid],
    },
  },
  {
    // ADR 0001: solar → home, solar → battery, solar → grid, then grid and battery fill the rest.
    name: "solver regression: import 200, export 600, solar 500, discharge 150, charge 200",
    visual: true,
    entities: splitEntities,
    states: {
      "sensor.grid_import": "200",
      "sensor.grid_export": "600",
      "sensor.solar": "500",
      "sensor.battery_discharge": "150",
      "sensor.battery_charge": "200",
    },
    energy: true,
    expect: {
      text: {
        ".grid .consumption": "200 W",
        ".grid .return": "600 W",
        ".battery .battery-in": "200 W",
        ".battery .battery-out": "150 W",
        ".home span.home": "50 W",
      },
      // solar→grid 450, battery↔grid 150 each way, solar→battery 50 and grid→home 50, solar→home 0.
      shown: [
        `${dot(flows.batteryGrid)}.battery-from-grid`,
        `${dot(flows.batteryGrid)}.battery-to-grid`,
      ],
      hidden: [dot(flows.solarToHome), dot(flows.batteryToHome)],
      fastestFirst: [dot(flows.solarToGrid), dot(flows.batteryGrid), dot(flows.gridToHome)],
    },
  },
  {
    name: "battery hub: solar and grid charge the battery, only the battery feeds home",
    visual: true,
    entities: splitEntities,
    options: { topology: "battery_hub" },
    states: {
      "sensor.grid_import": "500",
      "sensor.grid_export": "0",
      "sensor.solar": "3000",
      "sensor.battery_charge": "1500",
      "sensor.battery_discharge": "0",
    },
    energy: true,
    expect: {
      text: { ".home span.home": "2 kW" },
      shown: [
        dot(flows.solarToBattery),
        `${dot(flows.batteryGrid)}.battery-from-grid`,
        dot(flows.batteryToHome),
      ],
      hidden: [flows.solarToHome, flows.solarToGrid, flows.gridToHome],
      fastestFirst: [dot(flows.batteryToHome), `${dot(flows.batteryGrid)}.battery-from-grid`],
    },
  },
  {
    name: "battery hub without a battery keeps the standard wires",
    entities: { grid: combinedEntities.grid, solar: combinedEntities.solar },
    options: { topology: "battery_hub" },
    states: { "sensor.grid": "200", "sensor.solar": "1000" },
    expect: {
      text: { ".home span.home": "1.2 kW" },
      shown: [dot(flows.solarToHome), dot(flows.gridToHome)],
    },
  },
  {
    name: "isolated battery: no wire between battery and grid",
    entities: splitEntities,
    options: { topology: "isolated_battery" },
    states: {
      "sensor.grid_import": "0",
      "sensor.grid_export": "2000",
      "sensor.solar": "2500",
      "sensor.battery_charge": "0",
      "sensor.battery_discharge": "30",
    },
    energy: true,
    expect: {
      text: { ".home span.home": "530 W" },
      shown: [dot(flows.solarToGrid), dot(flows.solarToHome), dot(flows.batteryToHome)],
      hidden: [flows.batteryGrid],
    },
  },
];

/** A screenshot name for a scenario. */
export const screenshotName = (scenario: FlowScenario): string =>
  scenario.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

/** `500 W` → `500 Wh`: the energy card shows the same numbers as energy. */
export const asEnergyUnits = (text: string): string => text.replace(/(\d) ([kM]?)W\b/g, "$1 $2Wh");
