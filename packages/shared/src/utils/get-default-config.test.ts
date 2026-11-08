import { describe, expect, test } from "vite-plus/test";
import { fakeEntity, fakeHass } from "../testing/fixtures";
import { getDefaultConfig } from "./get-default-config";

describe("get-default-config", () => {
  test("getDefaultConfig detects likely power entities and battery percentage", () => {
    const hass = fakeHass({
      states: {
        "sensor.grid_power": fakeEntity("sensor.grid_power", "1200", {
          device_class: "power",
          friendly_name: "Grid Power",
        }),
        "sensor.solar_power": fakeEntity("sensor.solar_power", "800", {
          device_class: "power",
          friendly_name: "Solar Power",
        }),
        "sensor.home_battery_power": fakeEntity("sensor.home_battery_power", "300", {
          device_class: "power",
          friendly_name: "Home Battery",
        }),
        "sensor.battery_level": fakeEntity("sensor.battery_level", "65", {
          unit_of_measurement: "%",
          friendly_name: "Battery Level",
        }),
      },
    });

    const config = getDefaultConfig(hass, "power");

    expect(config.entities.grid?.entity).toBe("sensor.grid_power");
    expect(config.entities.solar?.entity).toBe("sensor.solar_power");
    expect(config.entities.battery.entity).toBe("sensor.home_battery_power");
    expect(config.entities.battery.state_of_charge).toBe("sensor.battery_level");
    expect(config.use_new_flow_rate_model).toBe(true);
    expect(config.sort_individual_devices).toBe(true);
  });
});
