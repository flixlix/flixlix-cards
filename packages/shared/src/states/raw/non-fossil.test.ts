import { describe, expect, test } from "vite-plus/test";
import { getNonFossilHas, getNonFossilHasPercentage } from "./non-fossil";
import { fakeConfig, fakeEntity, fakeHass } from "../../testing/fixtures";

const setup = (gridWatts: string, fossilPercentage: string) => {
  const hass = fakeHass({
    states: {
      "sensor.grid": fakeEntity("sensor.grid", gridWatts, { unit_of_measurement: "W" }),
      "sensor.fossil": fakeEntity("sensor.fossil", fossilPercentage, { unit_of_measurement: "%" }),
    },
  });
  const config = fakeConfig({
    entities: {
      grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } },
      fossil_fuel_percentage: { entity: "sensor.fossil", secondary_info: {} },
    },
  });
  return { hass, config };
};

describe("non-fossil presence", () => {
  test("is absent when all grid power is fossil", () => {
    const { hass, config } = setup("10", "100");

    expect(getNonFossilHas(hass, config)).toBe(false);
    expect(getNonFossilHasPercentage(hass, config)).toBe(false);
  });

  test("is present when part of the grid power is non-fossil", () => {
    const { hass, config } = setup("10", "40");

    expect(getNonFossilHas(hass, config)).toBe(true);
    expect(getNonFossilHasPercentage(hass, config)).toBe(true);
  });
});
