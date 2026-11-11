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

const deviceReadings = (accept_negative: boolean) =>
  ready(
    energyReadings(
      hassWith(),
      config({
        individual: [{ entity: "sensor.heat_pump", accept_negative }],
        auxiliary: { entity: "sensor.virtual_battery", accept_negative },
      }),
      { "sensor.heat_pump": -200, "sensor.virtual_battery": -3300 }
    )
  );

/** Only the auxiliary's secondary accepts negative values. */
const secondaryOf = (
  unit: string,
  growth: number,
  options: Partial<EnergyFlowCardPlusConfig> = {}
) =>
  ready(
    energyReadings(
      hassWith({ "sensor.secondary": ["859", unit] }),
      config(
        {
          individual: [{ entity: "sensor.device", secondary_info: { entity: "sensor.secondary" } }],
          auxiliary: {
            entity: "sensor.device",
            secondary_info: { entity: "sensor.secondary", accept_negative: true },
          },
        },
        options
      ),
      { "sensor.device": 100, "sensor.secondary": growth }
    )
  ).periodSecondaries;

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
    expect(result.grid).toEqual({ kind: "split", outOf: 1200, into: 300 });
    expect(result.solar.total).toBe(900);
  });

  test("a single grid or battery entity is read as one value", () => {
    const growth = { "sensor.grid": 500, "sensor.battery": 400 };
    const result = ready(
      energyReadings(
        hassWith(),
        config({ ...grid("sensor.grid", true), battery: { entity: "sensor.battery" } }),
        growth
      )
    );

    expect(result.grid).toEqual({ kind: "single", value: 500 });
    expect(result.battery).toEqual({ kind: "single", value: 400 });
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

  test.each([
    ["m³", 348.9],
    ["L", 348.9],
    ["MWh", 348_900_000],
    ["mWh", 0.3489],
  ])("without date selection, a reading in %s reads as %s", (unit, expected) => {
    const result = ready(
      energyReadings(
        hassWith({ "sensor.water": ["348.9", unit] }),
        config({ individual: [{ entity: "sensor.water" }] }, { energy_date_selection: false }),
        {}
      )
    );

    expect(result.individuals[0]).toBeCloseTo(expected);
  });

  test("an individual with secondary_info.sum_total adds its secondary entity's growth", () => {
    const individual = {
      entity: "sensor.charger",
      secondary_info: { entity: "sensor.charger_2", sum_total: true },
    };
    const read = (growth: Record<string, number>) =>
      ready(energyReadings(hassWith(), config({ individual: [individual] }), growth)).individuals;

    expect(read({ "sensor.charger": 1200, "sensor.charger_2": 300 })).toEqual([1500]);
    expect(read({ "sensor.charger_2": 300 })).toEqual([300]);
    expect(read({ "sensor.charger": 1200 })).toEqual([1200]);
    expect(read({})).toEqual([null]);
  });

  test("a device's growth that went down over the period is signed only with accept_negative", () => {
    expect(deviceReadings(true)).toMatchObject({ individuals: [-200], auxiliary: -3300 });
    expect(deviceReadings(false)).toMatchObject({ individuals: [0], auxiliary: 0 });
  });

  test("other nodes never read growth that went down over the period", () => {
    const result = ready(
      energyReadings(hassWith(), config({ solar: { entity: "sensor.solar" } }), {
        "sensor.solar": -100,
      })
    );

    expect(result.solar.total).toBe(0);
  });

  test("a device's secondary energy meter reads its growth over the period", () => {
    expect(secondaryOf("kWh", 5200)).toEqual({ individuals: [5200], auxiliary: 5200 });
    expect(secondaryOf("kWh", -1500)).toEqual({ individuals: [0], auxiliary: -1500 });
  });

  test("a device's secondary keeps its live state when it is no energy meter or the card ignores the period", () => {
    const live = { individuals: [null], auxiliary: null };

    expect(secondaryOf("°C", 5200)).toEqual(live);
    expect(secondaryOf("kWh", 5200, { energy_date_selection: false })).toEqual(live);
  });
});
