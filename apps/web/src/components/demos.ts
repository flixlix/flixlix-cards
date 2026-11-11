import { type CardConfig } from "@/components/card-preview";
import { sensor, type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";

/** What a demo renders: a stack of cards over one fake Home Assistant. */
export type Demo = {
  configs: CardConfig[];
  states: StateFixtures;
  /** Energy sensors' states are their usage on an average day; the period is selectable. */
  energy?: boolean;
  width?: number;
};

const percent = (state: string) => sensor(state, { unit: "%" });
const kilowattHours = (state: string, name?: string) => sensor(state, { unit: "kWh", name });

/**
 * A sunny afternoon: solar covers the home and charges the battery, the grid tops up the rest.
 * Every line carries power one way only.
 */
export const powerDemo: Demo = {
  configs: [
    {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_power" },
        solar: { entity: "sensor.solar_power" },
        battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
        fossil_fuel_percentage: { entity: "sensor.grid_fossil_fuel_percentage" },
        individual: [
          { entity: "sensor.ev_charger_power", name: "EV", icon: "mdi:car-electric" },
          { entity: "sensor.heat_pump_power", name: "Heat pump", icon: "mdi:heat-pump" },
        ],
      },
    },
  ],
  states: {
    "sensor.grid_power": "640",
    "sensor.solar_power": "3420",
    "sensor.battery_power": "-900",
    "sensor.battery_soc": percent("68"),
    "sensor.grid_fossil_fuel_percentage": percent("34"),
    "sensor.ev_charger_power": "1450",
    "sensor.heat_pump_power": "620",
  },
};

const HOUSE = "custom:home-flow-card";
const houseNodes = {
  grid: { entity: "sensor.grid_power" },
  solar: { entity: "sensor.solar_power" },
  battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
};

/** A moment in a day on the house: what Home Flow Card shows, for the docs and the playground. */
export type HouseMoment = {
  name: string;
  caption: string;
  config: CardConfig;
  states: StateFixtures;
};

/**
 * A day on the house, from a sunny afternoon to a grid outage. Readings are signed as Home
 * Assistant reports them: grid positive when importing, battery positive when discharging.
 */
export const houseMoments: HouseMoment[] = [
  {
    name: "A sunny afternoon",
    caption: "The roof charges the battery and sends the surplus to the grid.",
    config: { type: HOUSE, ...houseNodes },
    states: {
      "sensor.grid_power": "-1150",
      "sensor.solar_power": "4200",
      "sensor.battery_power": "-1600",
      "sensor.battery_soc": percent("68"),
    },
  },
  {
    name: "An evening on the battery",
    caption: "The sun is low; the battery carries the home, the grid rests.",
    config: { type: HOUSE, ...houseNodes },
    states: {
      "sensor.grid_power": "0",
      "sensor.solar_power": "350",
      "sensor.battery_power": "1900",
      "sensor.battery_soc": percent("54"),
    },
  },
  {
    name: "A night on the grid",
    caption: "The battery is nearly empty: its bar turns red and the grid takes over.",
    config: { type: HOUSE, ...houseNodes },
    states: {
      "sensor.grid_power": "720",
      "sensor.solar_power": "0",
      "sensor.battery_power": "0",
      "sensor.battery_soc": percent("12"),
    },
  },
  {
    name: "A grid outage",
    caption: "The grid cable goes dead and the generator steps in, wired to the inverter.",
    config: {
      type: HOUSE,
      ...houseNodes,
      grid: { entity: "sensor.grid_power", power_outage: { entity: "binary_sensor.grid_outage" } },
      generator: { entity: "sensor.generator_power" },
    },
    states: {
      "sensor.grid_power": "1600",
      "sensor.solar_power": "0",
      "sensor.battery_power": "400",
      "sensor.battery_soc": percent("38"),
      "binary_sensor.grid_outage": sensor("on", { unit: undefined }),
      "sensor.generator_power": "1600",
    },
  },
];

/**
 * The same moments on one card, configured with the outage and the generator throughout: the
 * card draws the generator only during the outage, so it stays mounted from moment to moment and
 * rolls its readings and morphs its words between them. States merge into the previous `hass`,
 * so every moment sets the outage sensor and the generator.
 */
export const houseDay: { config: CardConfig; moments: HouseMoment[] } = (() => {
  const outage = houseMoments.find((moment) => "generator" in moment.config);
  const config = outage?.config ?? { type: HOUSE, ...houseNodes };
  const gridUp: StateFixtures = {
    "binary_sensor.grid_outage": sensor("off", { unit: undefined }),
    "sensor.generator_power": "0",
  };
  return {
    config,
    moments: houseMoments.map((moment) => ({
      ...moment,
      config,
      states: { ...gridUp, ...moment.states },
    })),
  };
})();

const [sunnyAfternoon] = houseMoments;

/** The sunny afternoon on the house, the card's first impression. */
export const houseDemo: Demo = {
  configs: sunnyAfternoon ? [sunnyAfternoon.config] : [],
  states: sunnyAfternoon?.states ?? {},
  width: 440,
};

export const energyFlowCard: CardConfig = {
  type: "custom:energy-flow-card-plus",
  energy_date_selection: true,
  entities: {
    grid: {
      entity: {
        consumption: "sensor.grid_import_energy",
        production: "sensor.grid_export_energy",
      },
    },
    solar: { entity: "sensor.solar_energy" },
    battery: {
      entity: {
        consumption: "sensor.battery_discharge_energy",
        production: "sensor.battery_charge_energy",
      },
    },
    fossil_fuel_percentage: { entity: "sensor.grid_fossil_fuel_percentage" },
    individual: [
      { entity: "sensor.ev_charger_energy", name: "EV", icon: "mdi:car-electric" },
      { entity: "sensor.heat_pump_energy", name: "Heat pump", icon: "mdi:heat-pump" },
    ],
  },
};

/**
 * An average day: solar runs the home and fills the battery, the battery covers the evening, the
 * surplus goes to the grid and the grid covers the night.
 */
export const energyStates: StateFixtures = {
  "sensor.grid_import_energy": kilowattHours("5.2"),
  "sensor.grid_export_energy": kilowattHours("3.8"),
  "sensor.solar_energy": kilowattHours("21.4"),
  "sensor.battery_discharge_energy": kilowattHours("4.6"),
  "sensor.battery_charge_energy": kilowattHours("5.1"),
  "sensor.grid_fossil_fuel_percentage": percent("34"),
  "sensor.ev_charger_energy": kilowattHours("8.8"),
  "sensor.heat_pump_energy": kilowattHours("6.2"),
};

/** What a topology demo shows: the same readings drawn with one topology's wires. */
export type TopologyDemo = { topology: string; caption: string; demo: Demo };

const TOPOLOGY_CAPTIONS: ReadonlyArray<Pick<TopologyDemo, "topology" | "caption">> = [
  { topology: "standard", caption: "Every wire. Solar and grid reach home directly." },
  {
    topology: "battery_hub",
    caption: "Solar and grid charge the battery; only the battery feeds home.",
  },
  { topology: "isolated_battery", caption: "No wire between battery and grid." },
];

const powerTopologyDemo = (topology: string): Demo => ({
  configs: [
    {
      type: "custom:power-flow-card-plus",
      topology,
      entities: {
        grid: { entity: "sensor.grid_power" },
        solar: { entity: "sensor.solar_power" },
        battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
      },
    },
  ],
  states: {
    "sensor.grid_power": "500",
    "sensor.solar_power": "3000",
    "sensor.battery_power": "-1500",
    "sensor.battery_soc": percent("64"),
  },
});

const energyTopologyDemo = (topology: string): Demo => ({
  configs: [
    {
      type: "custom:energy-flow-card-plus",
      energy_date_selection: true,
      topology,
      entities: {
        grid: {
          entity: {
            consumption: "sensor.grid_import_energy",
            production: "sensor.grid_export_energy",
          },
        },
        solar: { entity: "sensor.solar_energy" },
        battery: {
          entity: {
            consumption: "sensor.battery_discharge_energy",
            production: "sensor.battery_charge_energy",
          },
        },
      },
    },
  ],
  states: {
    "sensor.grid_import_energy": kilowattHours("2"),
    "sensor.grid_export_energy": kilowattHours("0"),
    "sensor.solar_energy": kilowattHours("12"),
    "sensor.battery_discharge_energy": kilowattHours("0"),
    "sensor.battery_charge_energy": kilowattHours("6"),
  },
  energy: true,
});

/** One reading, three topologies: solar charges the battery and the grid tops up home. */
export const topologyDemos = (card: "power" | "energy"): TopologyDemo[] =>
  TOPOLOGY_CAPTIONS.map(({ topology, caption }) => ({
    topology,
    caption,
    demo: card === "power" ? powerTopologyDemo(topology) : energyTopologyDemo(topology),
  }));

export const energyDemo: Demo = { configs: [energyFlowCard], states: energyStates, energy: true };

export const periodSelector: CardConfig = {
  type: "custom:energy-period-selector-plus",
  card_background: true,
  period_buttons: ["day", "week", "month", "year"],
};

/** The period selector driving Energy Flow Card Plus, as on a dashboard. */
export const periodDemo: Demo = {
  configs: [periodSelector, energyFlowCard],
  states: energyStates,
  energy: true,
};

/** The period selector on its own, as it sits at the top of an energy dashboard. */
export const selectorDemo: Demo = { configs: [periodSelector], states: energyStates, energy: true };

export const sortableDemo: Demo = {
  configs: [
    {
      type: "custom:sortable-list-card",
      title: "Load priority",
      entity: "input_text.hems_priority",
      items: [
        { key: "battery", name: "Battery", icon: "mdi:battery-charging" },
        { key: "ev", name: "EV charger", icon: "mdi:car-electric" },
        { key: "heating", name: "Heating", icon: "mdi:radiator" },
        { key: "water_heater", name: "Hot water", icon: "mdi:water-boiler" },
      ],
    },
  ],
  states: {
    "input_text.hems_priority": sensor("battery,ev,heating,water_heater", { unit: undefined }),
  },
  width: 400,
};

export const breakdownDemo: Demo = {
  configs: [
    periodSelector,
    {
      type: "custom:energy-breakdown-card",
      title: "Energy breakdown",
      chart_type: "donut",
      energy_date_selection: true,
      entities: [
        { entity: "sensor.ev_charger_energy", name: "EV", icon: "mdi:car-electric" },
        { entity: "sensor.heat_pump_energy", name: "Heat pump", icon: "mdi:heat-pump" },
        { entity: "sensor.kitchen_energy", name: "Kitchen", icon: "mdi:stove" },
        { entity: "sensor.laundry_energy", name: "Laundry", icon: "mdi:washing-machine" },
        { entity: "sensor.office_energy", name: "Office", icon: "mdi:desktop-tower-monitor" },
      ],
    },
  ],
  states: {
    "sensor.ev_charger_energy": kilowattHours("8.8", "EV"),
    "sensor.heat_pump_energy": kilowattHours("6.2", "Heat pump"),
    "sensor.kitchen_energy": kilowattHours("3.1", "Kitchen"),
    "sensor.laundry_energy": kilowattHours("1.9", "Laundry"),
    "sensor.office_energy": kilowattHours("1.2", "Office"),
  },
  energy: true,
};
