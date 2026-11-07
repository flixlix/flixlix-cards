import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { energyReadings } from "./energy";

const hassWith = (states: Record<string, [state: string, unit: string]> = {}): HomeAssistant => {
  const hass: Partial<HomeAssistant> = {
    states: Object.fromEntries(
      Object.entries(states).map(([entityId, [state, unit]]) => [
        entityId,
        {
          entity_id: entityId,
          state,
          attributes: { unit_of_measurement: unit },
          last_changed: "",
          last_updated: "",
          context: { id: "", user_id: null, parent_id: null },
        },
      ])
    ),
  };
  return hass as HomeAssistant;
};

const config = (
  entities: EnergyFlowCardPlusConfig["entities"],
  options: Partial<EnergyFlowCardPlusConfig> = {}
) => ({ type: "custom:energy-flow-card-plus", entities, ...options }) as EnergyFlowCardPlusConfig;

const ready = (readings: ReturnType<typeof energyReadings>) => {
  if (readings.status !== "ready") {
    throw new Error("expected ready readings");
  }
  return readings;
};

const grid = (entity: string | { consumption: string; production: string }, invert = false) => ({
  grid: { entity, invert_state: invert, power_outage: { entity: "" } },
});

const battery = (invert: boolean) =>
  config({ battery: { entity: "sensor.battery", invert_state: invert } });

describe("energyReadings", () => {
  test("are loading until the period's growth map is available", () => {
    expect(energyReadings(hassWith(), config(grid("sensor.grid")), undefined)).toEqual({
      status: "loading",
    });
  });

  test("read Wh growth over the period from the growth map", () => {
    const result = ready(
      energyReadings(
        hassWith(),
        config({
          ...grid({ consumption: "sensor.import", production: "sensor.export" }),
          solar: { entity: "sensor.solar" },
        }),
        { "sensor.import": 1200, "sensor.export": 300, "sensor.solar": 900 }
      )
    );

    expect(result.family).toBe("energy");
    expect(result.grid).toEqual({ fromGrid: 1200, toGrid: 300 });
    expect(result.solar.total).toBe(900);
  });

  test("a single grid entity is import, or export with invert_state", () => {
    const growth = { "sensor.grid": 500 };

    expect(ready(energyReadings(hassWith(), config(grid("sensor.grid")), growth)).grid).toEqual({
      fromGrid: 500,
      toGrid: 0,
    });
    expect(
      ready(energyReadings(hassWith(), config(grid("sensor.grid", true)), growth)).grid
    ).toEqual({ fromGrid: 0, toGrid: 500 });
  });

  test("a single battery entity is charge, or discharge with invert_state", () => {
    const growth = { "sensor.battery": 400 };

    expect(ready(energyReadings(hassWith(), battery(false), growth)).battery).toEqual({
      toBattery: 400,
      fromBattery: 0,
    });
    expect(ready(energyReadings(hassWith(), battery(true), growth)).battery).toEqual({
      toBattery: 0,
      fromBattery: 400,
    });
  });

  test("a statistic missing from the growth map reads as null", () => {
    const result = ready(
      energyReadings(
        hassWith(),
        config({ solar: { entity: "sensor.solar" }, individual: [{ entity: "sensor.device" }] }),
        {}
      )
    );

    expect(result.solar.total).toBeNull();
    expect(result.individuals).toEqual([null]);
  });

  test("without date selection, read the entity state converted to Wh", () => {
    const result = ready(
      energyReadings(
        hassWith({ "sensor.solar": ["1.5", "kWh"] }),
        config({ solar: { entity: "sensor.solar" } }, { energy_date_selection: false }),
        {}
      )
    );

    expect(result.solar.total).toBe(1500);
  });
});
