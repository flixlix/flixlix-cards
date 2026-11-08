import { describe, expect, test } from "vite-plus/test";
import { fakeConfig } from "../testing/fixtures";
import { computeFlowRate, computeIndividualFlowRate } from "./compute-flow-rate";

describe("compute-flow-rate", () => {
  test("computeFlowRate returns max_flow_rate for invalid new model range", () => {
    const config = fakeConfig({
      max_expected_power: 100,
      min_expected_power: 100,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    });

    expect(computeFlowRate(config, 50, 0)).toBe(10);
  });

  test("computeFlowRate (new model) clamps above max_expected_power", () => {
    const config = fakeConfig({
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    });

    expect(computeFlowRate(config, 101, 0)).toBe(1);
  });

  test("computeFlowRate (new model) maps min/max linearly", () => {
    const config = fakeConfig({
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    });

    expect(computeFlowRate(config, 0, 0)).toBe(10);
    expect(computeFlowRate(config, 100, 0)).toBe(1);
    expect(computeFlowRate(config, 50, 0)).toBeCloseTo(5.5, 10);
  });

  test("computeFlowRate (old model) uses total when provided", () => {
    const config = fakeConfig({
      max_expected_power: 100,
      min_expected_power: 0,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: false,
    });

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
});
