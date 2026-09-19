import { describe, expect, test } from "vitest";

import {
  createAggregateBatteryObject,
  createBatteryObject,
  getBatteryConfigInState,
  getBatteryConfigOutState,
  getBatteryInState,
  getBatteryOutState,
} from "../src/states/raw/battery";
import { type FlowCardPlusConfig } from "../src/types";

const makeHass = (states: Record<string, string>) =>
  ({
    states: Object.fromEntries(
      Object.entries(states).map(([entity_id, state]) => [
        entity_id,
        { entity_id, state, attributes: { unit_of_measurement: "W" } },
      ])
    ),
  }) as any;

describe("battery aggregation", () => {
  test("sums charge and discharge across multiple batteries", () => {
    const hass = makeHass({
      "sensor.batt1": "-500",
      "sensor.batt2": "300",
      "sensor.batt3_in": "200",
      "sensor.batt3_out": "100",
    });
    const config = {
      entities: {
        battery: [
          { entity: "sensor.batt1" },
          { entity: "sensor.batt2" },
          {
            entity: {
              production: "sensor.batt3_in",
              consumption: "sensor.batt3_out",
            },
          },
        ],
      },
    } as FlowCardPlusConfig;

    expect(getBatteryInState(hass, config)).toBe(700);
    expect(getBatteryOutState(hass, config)).toBe(400);
  });

  test("excludes satellite batteries from distribution totals", () => {
    const hass = makeHass({
      "sensor.main": "-400",
      "sensor.plug": "-200",
      "sensor.garage": "100",
    });
    const config = {
      entities: {
        battery: [
          { entity: "sensor.main", role: "primary" },
          { entity: "sensor.plug", role: "satellite" },
          { entity: "sensor.garage", role: "satellite" },
        ],
      },
    } as FlowCardPlusConfig;

    expect(getBatteryInState(hass, config)).toBe(400);
    expect(getBatteryOutState(hass, config)).toBe(0);
  });

  test("respects invert_state per battery", () => {
    const hass = makeHass({
      "sensor.batt1": "-200",
      "sensor.batt2": "-150",
    });
    expect(getBatteryConfigInState(hass, { entity: "sensor.batt1" })).toBe(200);
    expect(getBatteryConfigOutState(hass, { entity: "sensor.batt1" })).toBe(0);
    expect(getBatteryConfigInState(hass, { entity: "sensor.batt2", invert_state: true })).toBe(0);
    expect(getBatteryConfigOutState(hass, { entity: "sensor.batt2", invert_state: true })).toBe(
      150
    );
  });

  test("createAggregateBatteryObject sums visible pack flows", () => {
    const hass = makeHass({
      "sensor.a": "-100",
      "sensor.b": "50",
      "sensor.a_soc": "80",
      "sensor.b_soc": "40",
    });
    const batteries = [
      createBatteryObject({
        hass,
        batteryConfig: { entity: "sensor.a", state_of_charge: "sensor.a_soc", name: "A" },
        fallbackName: "Battery",
        toBattery: 100,
        fromBattery: 0,
      }),
      createBatteryObject({
        hass,
        batteryConfig: { entity: "sensor.b", state_of_charge: "sensor.b_soc", name: "B" },
        fallbackName: "Battery",
        toBattery: 0,
        fromBattery: 50,
      }),
    ];
    const aggregate = createAggregateBatteryObject({
      batteries,
      fallbackName: "Battery",
    });

    expect(aggregate.has).toBe(true);
    expect(aggregate.name).toBe("A");
    expect(aggregate.state.toBattery).toBe(100);
    expect(aggregate.state.fromBattery).toBe(50);
    expect(aggregate.state_of_charge.state).toBe(80);
  });
});
