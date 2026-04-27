import { describe, expect, test } from "vitest";

import { adjustZeroTolerance } from "../src/states/tolerance/base";
import { type FlowCardPlusConfig } from "../src/types";
import { computeFlowRate, computeIndividualFlowRate } from "../src/utils/compute-flow-rate";
import { displayValue } from "../src/utils/display-value";

const thinSpace = `\u2009`;

describe("core utils", () => {
  test("adjustZeroTolerance returns 0 for null/zero values", () => {
    expect(adjustZeroTolerance(null, 10)).toBe(0);
    expect(adjustZeroTolerance(0, 10)).toBe(0);
  });

  test("adjustZeroTolerance returns original value when tolerance is missing", () => {
    expect(adjustZeroTolerance(5, undefined)).toBe(5);
  });

  test("adjustZeroTolerance returns 0 when value is below tolerance", () => {
    expect(adjustZeroTolerance(4.9, 5)).toBe(0);
  });

  test("adjustZeroTolerance returns original value when value meets tolerance", () => {
    expect(adjustZeroTolerance(5, 5)).toBe(5);
  });

  test("computeFlowRate (new model) clamps above max_expected_power", () => {
    const config = {
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    } as unknown as FlowCardPlusConfig;

    expect(computeFlowRate(config, 101, 0)).toBe(1);
  });

  test("computeFlowRate (new model) maps min/max linearly", () => {
    const config = {
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    } as unknown as FlowCardPlusConfig;

    expect(computeFlowRate(config, 0, 0)).toBe(10);
    expect(computeFlowRate(config, 100, 0)).toBe(1);
    expect(computeFlowRate(config, 50, 0)).toBeCloseTo(5.5, 10);
  });

  test("computeFlowRate (old model) uses total when provided", () => {
    const config = {
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: false,
    } as unknown as FlowCardPlusConfig;

    expect(computeFlowRate(config, 25, 100)).toBeCloseTo(7.75, 10);
  });

  test("computeIndividualFlowRate returns value when entry is not false and value is provided", () => {
    expect(computeIndividualFlowRate(true, 2.5)).toBe(2.5);
  });

  test("computeIndividualFlowRate returns entry when entry is a number", () => {
    expect(computeIndividualFlowRate(3.3, undefined)).toBe(3.3);
  });

  test("computeIndividualFlowRate returns default when entry is false", () => {
    expect(computeIndividualFlowRate(false, 2.5)).toBe(1.66);
  });

  test("displayValue returns 0 for null", () => {
    const hass = { locale: "en" } as any;
    const config = {
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    } as unknown as FlowCardPlusConfig;
    expect(displayValue(hass, config, null, {})).toBe(`0${thinSpace}W`);
  });

  test("displayValue chooses kW when unit is missing and value >= kilo_threshold", () => {
    const hass = { locale: "en" } as any;
    const config = {
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    } as unknown as FlowCardPlusConfig;
    expect(displayValue(hass, config, 1500, {})).toBe(`1.5${thinSpace}kW`);
  });

  test("displayValue uses W when unit is missing and value < kilo_threshold", () => {
    const hass = { locale: "en" } as any;
    const config = {
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    } as unknown as FlowCardPlusConfig;
    expect(displayValue(hass, config, 500, {})).toBe(`500${thinSpace}W`);
  });

  test("displayValue respects accept_negative", () => {
    const hass = { locale: "en" } as any;
    const config = {
      type: "power-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      kilo_threshold: 1000,
    } as unknown as FlowCardPlusConfig;
    expect(displayValue(hass, config, -500, { accept_negative: false })).toBe(`500${thinSpace}W`);
    expect(displayValue(hass, config, -500, { accept_negative: true })).toBe(`-500${thinSpace}W`);
  });
});
