import { fakeHass, sensor } from "@flixlix-cards/shared/testing/fake-hass";
import { fakeConditionContext, fakeConfig } from "@flixlix-cards/shared/testing/fixtures";
import { type TemplatesObj } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { computeCardState, energyReadings, powerReadings, watchedEntities } from ".";

const noTemplates: TemplatesObj = {
  gridSecondary: undefined,
  solarSecondary: undefined,
  homeSecondary: undefined,
  nonFossilFuelSecondary: undefined,
  auxiliarySecondary: undefined,
  individual: [],
};

const secondary = (entity: string) => ({ secondary_info: { entity, sum_total: true } });

/** A config using every option that makes a flow card read an entity. */
const everyOption = fakeConfig({
  energy_date_selection: false,
  entities: {
    grid: {
      entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" },
      use_metadata: true,
      power_outage: { entity: "binary_sensor.outage", entity_generator: "sensor.generator" },
      ...secondary("sensor.grid_secondary"),
    },
    solar: {
      entity: "sensor.solar_a|sensor.solar_b",
      use_metadata: true,
      ...secondary("sensor.solar_secondary"),
    },
    battery: {
      entity: { consumption: "sensor.battery_out", production: "sensor.battery_in" },
      state_of_charge: "sensor.battery_soc",
      use_metadata: true,
    },
    home: {
      entity: "sensor.home",
      override_state: true,
      use_metadata: true,
      ...secondary("sensor.home_secondary"),
    },
    fossil_fuel_percentage: {
      entity: "sensor.fossil",
      use_metadata: true,
      ...secondary("sensor.fossil_secondary"),
    },
    individual: [
      {
        entity: "sensor.ev",
        use_metadata: true,
        ...secondary("sensor.ev_secondary"),
        visibility: [
          { condition: "state", entity: "binary_sensor.ev_plugged", state_not: "off" },
          {
            condition: "or",
            conditions: [
              { condition: "numeric_state", entity: "sensor.ev_soc", below: "input_number.ev_max" },
            ],
          },
        ],
      },
      {
        entity: "sensor.heat_pump",
        use_metadata: true,
        ...secondary("sensor.heat_pump_secondary"),
      },
    ],
  },
});

/** A hass whose every entity exists, recording which entity ids the card looks up. */
const recordingHass = (): { hass: HomeAssistant; read: Set<string> } => {
  const read = new Set<string>();
  const base = fakeHass();
  const states = new Proxy<HomeAssistant["states"]>(
    {},
    {
      get: (_, id) => {
        read.add(String(id));
        return { entity_id: String(id), ...sensor("100") };
      },
      has: (_, id) => {
        read.add(String(id));
        return true;
      },
    }
  );
  return { hass: { ...base, states }, read };
};

const cardInput = (hass: HomeAssistant) => ({
  config: everyOption,
  hass,
  templates: noTemplates,
  conditionContext: fakeConditionContext,
  width: 500,
});

describe("watched entities", () => {
  test("are exactly the entities the power card reads", () => {
    const { hass, read } = recordingHass();
    computeCardState({ ...cardInput(hass), readings: powerReadings(hass, everyOption) });
    expect(new Set(watchedEntities(everyOption))).toEqual(read);
  });

  test("are exactly the entities the energy card reads from states", () => {
    const { hass, read } = recordingHass();
    computeCardState({ ...cardInput(hass), readings: energyReadings(hass, everyOption, {}) });
    expect(new Set(watchedEntities(everyOption))).toEqual(read);
  });

  test("list each entity once, without the separator of combined entities", () => {
    const config = fakeConfig({
      entities: {
        grid: { entity: "sensor.a" },
        home: { entity: "sensor.a|sensor.b", secondary_info: { entity: "sensor.b" } },
      },
    });
    expect(watchedEntities(config)).toEqual(["sensor.a", "sensor.b"]);
  });
});
