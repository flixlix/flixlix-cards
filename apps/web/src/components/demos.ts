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

const energyFlowCard: CardConfig = {
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
const energyStates: StateFixtures = {
  "sensor.grid_import_energy": kilowattHours("5.2"),
  "sensor.grid_export_energy": kilowattHours("3.8"),
  "sensor.solar_energy": kilowattHours("21.4"),
  "sensor.battery_discharge_energy": kilowattHours("4.6"),
  "sensor.battery_charge_energy": kilowattHours("5.1"),
  "sensor.grid_fossil_fuel_percentage": percent("34"),
  "sensor.ev_charger_energy": kilowattHours("8.8"),
  "sensor.heat_pump_energy": kilowattHours("6.2"),
};

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
