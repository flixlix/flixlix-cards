import { describe, expect, test } from "vitest";

import { computeFieldIcon, computeFieldName } from "../src/utils/compute-field-attributes";
import { getDefaultConfig } from "../src/utils/get-default-config";
import { coerceNumber, coerceStringArray, isNumberValue, round } from "../src/utils/utils";

describe("utility helpers", () => {
  test("computeFieldName and computeFieldIcon prioritize explicit values", () => {
    const hass = { states: {} } as any;
    const field = {
      name: "Configured Name",
      icon: "mdi:configured",
      entity: "sensor.grid_power",
      use_metadata: true,
    } as any;

    expect(computeFieldName(hass, field, "Fallback Name")).toBe("Configured Name");
    expect(computeFieldIcon(hass, field, "mdi:fallback")).toBe("mdi:configured");
  });

  test("computeFieldName and computeFieldIcon resolve metadata for single and split entities", () => {
    const hass = {
      states: {
        "sensor.grid_import": {
          state: "100",
          entity_id: "sensor.grid_import",
          attributes: { friendly_name: "Grid Import", icon: "mdi:transmission-tower" },
        },
        "sensor.grid_export": {
          state: "20",
          entity_id: "sensor.grid_export",
          attributes: { friendly_name: "Grid Export", icon: "mdi:transmission-tower-export" },
        },
      },
    } as any;

    const single = {
      entity: "sensor.grid_import",
      use_metadata: true,
    } as any;
    const split = {
      entity: { consumption: "sensor.grid_import", production: "sensor.grid_export" },
      use_metadata: true,
    } as any;

    expect(computeFieldName(hass, single, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, single, "mdi:fallback")).toBe("mdi:transmission-tower");
    expect(computeFieldName(hass, split, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, split, "mdi:fallback")).toBe("mdi:transmission-tower");
  });

  test("getDefaultConfig detects likely power entities and battery percentage", () => {
    const hass = {
      states: {
        "sensor.grid_power": {
          state: "1200",
          entity_id: "sensor.grid_power",
          attributes: {
            device_class: "power",
            friendly_name: "Grid Power",
          },
        },
        "sensor.solar_power": {
          state: "800",
          entity_id: "sensor.solar_power",
          attributes: {
            device_class: "power",
            friendly_name: "Solar Power",
          },
        },
        "sensor.home_battery_power": {
          state: "300",
          entity_id: "sensor.home_battery_power",
          attributes: {
            device_class: "power",
            friendly_name: "Home Battery",
          },
        },
        "sensor.battery_level": {
          state: "65",
          entity_id: "sensor.battery_level",
          attributes: {
            unit_of_measurement: "%",
            friendly_name: "Battery Level",
          },
        },
      },
    } as any;

    const config = getDefaultConfig(hass, "power") as any;

    expect(config.entities.grid.entity).toBe("sensor.grid_power");
    expect(config.entities.solar.entity).toBe("sensor.solar_power");
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
    expect(coerceStringArray(" a  b   c ")).toEqual(["a", "b", "c"]);
    expect(coerceStringArray(["x", " ", "y"])).toEqual(["x", "y"]);
  });
});
