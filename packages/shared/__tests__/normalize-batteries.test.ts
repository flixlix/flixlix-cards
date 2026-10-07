import { describe, expect, test } from "vitest";

import {
  getBatteryConfigInState,
  getBatteryConfigOutState,
  getBatteryInState,
  getBatteryOutState,
  getBatteryStateOfCharge,
} from "../src/states/raw/battery";
import {
  getPrimaryBattery,
  hasBatteryEntity,
  normalizeBatteries,
  serializeBatteries,
} from "../src/utils/normalize-batteries";

describe("normalizeBatteries", () => {
  test("normalizes single battery object and arrays", () => {
    const single = { entity: "sensor.a", color_circle: "color_dynamically" as const };
    const multi = [
      { entity: "sensor.a", color_circle: "color_dynamically" as const },
      { entity: "sensor.b", color_circle: "color_dynamically" as const },
    ];

    expect(normalizeBatteries(undefined)).toEqual([]);
    expect(normalizeBatteries(single)).toEqual([single]);
    expect(normalizeBatteries(multi)).toEqual(multi);
    expect(getPrimaryBattery(multi)?.entity).toBe("sensor.a");
    expect(hasBatteryEntity(single)).toBe(true);
    expect(hasBatteryEntity([{ color_circle: "color_dynamically" } as any])).toBe(false);
    expect(serializeBatteries(multi)).toEqual(multi);
    expect(serializeBatteries([single])).toEqual(single);
    expect(serializeBatteries([])).toBeUndefined();
  });
});

describe("multi battery state aggregation", () => {
  const hass = {
    states: {
      "sensor.battery_a": {
        state: "200",
        attributes: { unit_of_measurement: "W", friendly_name: "Battery A" },
      },
      "sensor.battery_b": {
        state: "-100",
        attributes: { unit_of_measurement: "W", friendly_name: "Battery B" },
      },
      "sensor.battery_a_soc": {
        state: "80",
        attributes: { unit_of_measurement: "%", friendly_name: "Battery A SOC" },
      },
      "sensor.battery_b_soc": {
        state: "40",
        attributes: { unit_of_measurement: "%", friendly_name: "Battery B SOC" },
      },
      "sensor.battery_a_charge": {
        state: "150",
        attributes: { unit_of_measurement: "W", friendly_name: "Battery A Charge" },
      },
      "sensor.battery_a_discharge": {
        state: "50",
        attributes: { unit_of_measurement: "W", friendly_name: "Battery A Discharge" },
      },
    },
  } as any;

  test("sums charge and discharge across batteries", () => {
    const config = {
      entities: {
        battery: [
          {
            entity: "sensor.battery_a",
            state_of_charge: "sensor.battery_a_soc",
            color_circle: "color_dynamically",
          },
          {
            entity: "sensor.battery_b",
            state_of_charge: "sensor.battery_b_soc",
            color_circle: "color_dynamically",
          },
        ],
      },
    } as any;

    expect(getBatteryInState(hass, config)).toBe(100);
    expect(getBatteryOutState(hass, config)).toBe(200);
    expect(getBatteryStateOfCharge(hass, config)).toBe(60);
  });

  test("weights SOC by capacity when provided", () => {
    const config = {
      entities: {
        battery: [
          {
            entity: "sensor.battery_a",
            state_of_charge: "sensor.battery_a_soc",
            capacity: 10,
            color_circle: "color_dynamically",
          },
          {
            entity: "sensor.battery_b",
            state_of_charge: "sensor.battery_b_soc",
            capacity: 30,
            color_circle: "color_dynamically",
          },
        ],
      },
    } as any;

    expect(getBatteryStateOfCharge(hass, config)).toBe(50);
  });

  test("supports split production/consumption entities per battery", () => {
    const battery = {
      entity: {
        production: "sensor.battery_a_charge",
        consumption: "sensor.battery_a_discharge",
      },
      color_circle: "color_dynamically" as const,
    };

    expect(getBatteryConfigInState(hass, battery)).toBe(150);
    expect(getBatteryConfigOutState(hass, battery)).toBe(50);
  });
});
