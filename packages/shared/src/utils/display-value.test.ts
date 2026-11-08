import { describe, expect, test } from "vite-plus/test";
import { fakeConfig, fakeHass } from "../testing/fixtures";
import { displayValue } from "./display-value";

const thinSpace = `\u2009`;

describe("display-value", () => {
  test("displayValue supports mega units and explicit unit formatting", () => {
    const hass = fakeHass();
    const config = fakeConfig({
      type: "energy-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      mega_decimals: 2,
      kilo_threshold: 1000,
      mega_threshold: 1000000,
    });

    expect(displayValue(hass, config, 1500000, {})).toBe(`1.5${thinSpace}MWh`);
    expect(displayValue(hass, config, 1500000, {})).toContain("MWh");
    expect(displayValue(hass, config, 1500, { unit: "Wh", unitWhiteSpace: false })).toBe("1,500Wh");
  });

  test("displayValue returns 0 for null", () => {
    const hass = fakeHass();
    const config = fakeConfig({
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    });
    expect(displayValue(hass, config, null, {})).toBe(`0${thinSpace}W`);
  });

  test("displayValue chooses kW when unit is missing and value >= kilo_threshold", () => {
    const hass = fakeHass();
    const config = fakeConfig({
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    });
    expect(displayValue(hass, config, 1500, {})).toBe(`1.5${thinSpace}kW`);
  });

  test("displayValue uses W when unit is missing and value < kilo_threshold", () => {
    const hass = fakeHass();
    const config = fakeConfig({
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    });
    expect(displayValue(hass, config, 500, {})).toBe(`500${thinSpace}W`);
  });

  test("displayValue respects accept_negative", () => {
    const hass = fakeHass();
    const config = fakeConfig({
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    });
    expect(displayValue(hass, config, -500, { accept_negative: false })).toBe(`500${thinSpace}W`);
    expect(displayValue(hass, config, -500, { accept_negative: true })).toBe(`-500${thinSpace}W`);
  });
});
