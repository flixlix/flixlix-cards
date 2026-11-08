import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { powerReadings } from "./power";

const hassWith = (states: Record<string, [state: string, unit?: string]>): HomeAssistant => {
  const hass: Partial<HomeAssistant> = {
    states: Object.fromEntries(
      Object.entries(states).map(([entityId, [state, unit = "W"]]) => [
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

const readings = (
  entities: FlowCardPlusConfig["entities"],
  states: Record<string, [string, string?]>
) =>
  powerReadings(hassWith(states), {
    type: "custom:power-flow-card-plus",
    entities,
  } as FlowCardPlusConfig);

describe("powerReadings", () => {
  test("a single grid or battery entity is read as one signed value", () => {
    const entities = {
      grid: { entity: "sensor.grid", power_outage: { entity: "" } },
      battery: { entity: "sensor.battery", invert_state: true },
    };
    const result = readings(entities, { "sensor.grid": ["-200"], "sensor.battery": ["300"] });

    expect(result.grid).toEqual({ kind: "single", value: -200 });
    expect(result.battery).toEqual({ kind: "single", value: 300 });
  });

  test("split consumption/production entities are read separately", () => {
    const entities = {
      grid: {
        entity: { consumption: "sensor.import", production: "sensor.export" },
        power_outage: { entity: "" },
      },
    };
    const result = readings(entities, { "sensor.import": ["120"], "sensor.export": ["30"] });

    expect(result.grid).toEqual({ kind: "split", outOf: 120, into: 30 });
  });

  test("kW and MW readings are converted to W", () => {
    const solar = { solar: { entity: "sensor.solar" } };

    expect(readings(solar, { "sensor.solar": ["1.5", "kW"] }).solar.total).toBe(1500);
    expect(readings(solar, { "sensor.solar": ["1.5", "MW"] }).solar.total).toBe(1_500_000);
  });

  test.each(["unavailable", "unknown", "abc"])("a %s state reads as null", (state) => {
    const entities = {
      grid: { entity: "sensor.grid", power_outage: { entity: "" } },
      individual: [{ entity: "sensor.device" }],
    };
    const result = readings(entities, { "sensor.grid": [state], "sensor.device": [state] });

    expect(result.grid).toEqual({ kind: "single", value: null });
    expect(result.individuals).toEqual([null]);
  });

  test("entities joined with | are summed", () => {
    const result = readings(
      { solar: { entity: "sensor.roof | sensor.garage" } },
      { "sensor.roof": ["300"], "sensor.garage": ["200"] }
    );

    expect(result.solar.total).toBe(500);
  });

  test("a summed secondary solar entity adds to the solar total", () => {
    const result = readings(
      {
        solar: {
          entity: "sensor.roof",
          secondary_info: { entity: "sensor.balcony", sum_total: true },
        },
      },
      { "sensor.roof": ["300"], "sensor.balcony": ["50"] }
    );

    expect(result.solar).toEqual({ total: 350, secondary: 50 });
  });
});
