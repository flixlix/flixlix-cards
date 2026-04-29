import { describe, expect, test } from "vitest";
import { FlixlixPowerCard } from "../src/power-pulse-card";
import { type FlixlixPowerCardConfig } from "../src/types";

describe("power-pulse-card render", () => {
  test("setConfig accepts a minimum source-only config", () => {
    const card = new FlixlixPowerCard();
    const config: FlixlixPowerCardConfig = {
      type: "custom:power-pulse-card",
      entities: {
        grid: { entity: "sensor.grid" },
        solars: [{ entity: "sensor.solar_east" }, { entity: "sensor.solar_west" }],
        batteries: [
          { entity: "sensor.battery_1", state_of_charge: "sensor.battery_1_soc" },
          { entity: "sensor.battery_2", state_of_charge: "sensor.battery_2_soc" },
        ],
        devices: [{ entity: "sensor.kitchen" }, { entity: "sensor.office" }],
      },
    };
    card.setConfig(config);
    expect(() => card.setConfig(config)).not.toThrow();
  });

  test("setConfig rejects when no source is configured", () => {
    const card = new FlixlixPowerCard();
    expect(() =>
      card.setConfig({
        type: "custom:power-pulse-card",
        entities: { home: {} },
      } as unknown as FlixlixPowerCardConfig)
    ).toThrow();
  });
});
