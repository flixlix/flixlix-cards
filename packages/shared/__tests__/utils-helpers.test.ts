import { describe, expect, test } from "vite-plus/test";
import { fakeEntity, fakeHass } from "./fixtures";

import { computeFieldIcon, computeFieldName } from "../src/utils/compute-field-attributes";
import { getDefaultConfig } from "../src/utils/get-default-config";
import { coerceNumber, isNumberValue, round } from "../src/utils/utils";

describe("utility helpers", () => {
  test("computeFieldName and computeFieldIcon prioritize explicit values", () => {
    const hass = fakeHass();
    const field = {
      name: "Configured Name",
      icon: "mdi:configured",
      entity: "sensor.grid_power",
      use_metadata: true,
    };

    expect(computeFieldName(hass, field, "Fallback Name")).toBe("Configured Name");
    expect(computeFieldIcon(hass, field, "mdi:fallback")).toBe("mdi:configured");
  });

  test("computeFieldName and computeFieldIcon resolve metadata for single and split entities", () => {
    const hass = fakeHass({
      states: {
        "sensor.grid_import": fakeEntity("sensor.grid_import", "100", {
          friendly_name: "Grid Import",
          icon: "mdi:transmission-tower",
        }),
        "sensor.grid_export": fakeEntity("sensor.grid_export", "20", {
          friendly_name: "Grid Export",
          icon: "mdi:transmission-tower-export",
        }),
      },
    });

    const single = {
      entity: "sensor.grid_import",
      use_metadata: true,
    };
    const split = {
      entity: { consumption: "sensor.grid_import", production: "sensor.grid_export" },
      use_metadata: true,
    };

    expect(computeFieldName(hass, single, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, single, "mdi:fallback")).toBe("mdi:transmission-tower");
    expect(computeFieldName(hass, split, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, split, "mdi:fallback")).toBe("mdi:transmission-tower");
  });

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
  });

  test("number coercion and array coercion helpers handle mixed inputs", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(isNumberValue("12.3")).toBe(true);
    expect(isNumberValue("12abc")).toBe(false);
    expect(coerceNumber("12.5")).toBe(12.5);
    expect(coerceNumber("nope", 99)).toBe(99);
  });
});
