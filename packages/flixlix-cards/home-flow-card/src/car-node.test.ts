import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { carEntities, carStatus } from "./car-node";
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

  test("without conditions it always shows, idle while it draws no power", () => {
    const plain: HouseCar = { entity: "sensor.wallbox" };
    expect(carStatus(hass({ "sensor.wallbox": "7400" }), plain)).toBe("active");
    expect(carStatus(hass({ "sensor.wallbox": "-3000" }), plain)).toBe("active");
    expect(carStatus(hass({ "sensor.wallbox": "0" }), plain)).toBe("idle");
    expect(carStatus(hass({ "sensor.wallbox": "unavailable" }), plain)).toBe("idle");
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
