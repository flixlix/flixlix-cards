import { energyReader, wattsReader } from "@flixlix-cards/shared/card-state";
import { fakeConditionContext } from "@flixlix-cards/shared/testing/fixtures";
import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { carEntities, carStatus as statusWith } from "./car-node";
import { type HouseCar } from "./types";

const hass = (states: Record<string, string>): HomeAssistant => {
  const partialHass: Partial<HomeAssistant> = {
    states: Object.fromEntries(
      Object.entries(states).map(([id, state]) => [
        id,
        {
          entity_id: id,
          state,
          attributes: {},
          last_changed: "",
          last_updated: "",
          context: { id: "", user_id: null, parent_id: null },
        },
      ])
    ),
  };
  return partialHass as HomeAssistant;
};

const car: HouseCar = {
  entity: "sensor.wallbox",
  visibility: [{ condition: "state", entity: "device_tracker.car", state: "home" }],
  idle: [{ condition: "state", entity: "binary_sensor.cable", state: "off" }],
};

const carStatus = (states: HomeAssistant, config: HouseCar) =>
  statusWith(states, config, wattsReader(states), "power", fakeConditionContext);

/** Over a period, read as the energy each entity's statistic grew by. */
const periodStatus = (states: HomeAssistant, config: HouseCar, growth: Record<string, number>) =>
  statusWith(states, config, energyReader(states, growth, true), "energy", fakeConditionContext);

describe("car status", () => {
  test("away, the car is hidden whatever it draws", () => {
    expect(carStatus(hass({ "device_tracker.car": "work", "sensor.wallbox": "7400" }), car)).toBe(
      "hidden"
    );
  });

  test("home, it is idle while its idle conditions hold, active otherwise", () => {
    const home = { "device_tracker.car": "home", "sensor.wallbox": "0" };
    expect(carStatus(hass({ ...home, "binary_sensor.cable": "off" }), car)).toBe("idle");
    expect(carStatus(hass({ ...home, "binary_sensor.cable": "on" }), car)).toBe("active");
  });

  test("idle conditions as Home Assistant's editor writes them make the car idle", () => {
    const written: HouseCar = {
      entity: "sensor.wallbox",
      idle: [{ condition: "state", entity_id: "sensor.connector", state: ["Unplugged"] }],
    };
    expect(
      carStatus(hass({ "sensor.connector": "Unplugged", "sensor.wallbox": "0" }), written)
    ).toBe("idle");
    expect(
      carStatus(hass({ "sensor.connector": "Charging", "sensor.wallbox": "0" }), written)
    ).toBe("active");
  });

  test("without conditions it always shows, idle while it draws no power", () => {
    const plain: HouseCar = { entity: "sensor.wallbox" };
    expect(carStatus(hass({ "sensor.wallbox": "7400" }), plain)).toBe("active");
    expect(carStatus(hass({ "sensor.wallbox": "-3000" }), plain)).toBe("active");
    expect(carStatus(hass({ "sensor.wallbox": "0" }), plain)).toBe("idle");
    expect(carStatus(hass({ "sensor.wallbox": "unavailable" }), plain)).toBe("idle");
  });
  test("over a period it is idle only while it used nothing, whatever it is doing now", () => {
    const unplugged = hass({ "device_tracker.car": "home", "binary_sensor.cable": "off" });
    expect(periodStatus(unplugged, car, { "sensor.wallbox": 12_000 })).toBe("active");
    expect(periodStatus(unplugged, car, { "sensor.wallbox": 0 })).toBe("idle");
  });

  test("over a period it still hides while away", () => {
    const away = hass({ "device_tracker.car": "work" });
    expect(periodStatus(away, car, { "sensor.wallbox": 12_000 })).toBe("hidden");
  });

  test("the card watches the car's entities and those its conditions read", () => {
    expect(carEntities({ ...car, state_of_charge: "sensor.car_soc" })).toEqual([
      "sensor.wallbox",
      "sensor.car_soc",
      "device_tracker.car",
      "binary_sensor.cable",
    ]);
  });
});
