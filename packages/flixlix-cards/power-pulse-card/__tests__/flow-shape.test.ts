import { describe, expect, test } from "vitest";
import { intensityToGap, intensityToSpeed, powerToIntensity } from "../src/utils/flow-shape";

describe("powerToIntensity", () => {
  test("clamps to 0 below the minimum", () => {
    expect(powerToIntensity(0)).toBe(0);
    expect(powerToIntensity(5)).toBe(0); // exactly at min
    expect(powerToIntensity(-100)).toBe(0);
  });

  test("clamps to 1 at or above the maximum", () => {
    expect(powerToIntensity(5000)).toBe(1);
    expect(powerToIntensity(10000)).toBe(1);
  });

  test("uses sqrt curve so mid values are not punishingly low", () => {
    // 100 W on default 5–5000 range: linear share = 95/4995 ≈ 0.019 → sqrt ≈ 0.138.
    expect(powerToIntensity(100)).toBeCloseTo(0.138, 2);
    // 2000 W: linear ≈ 0.4 → sqrt ≈ 0.632.
    expect(powerToIntensity(2000)).toBeCloseTo(0.632, 2);
  });

  test("respects custom min and max", () => {
    // On a narrow 5–200 W range, 100 W should feel close to full.
    const v = powerToIntensity(100, { min: 5, max: 200 });
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(0.75);
  });

  test("monotonic across the active range", () => {
    expect(powerToIntensity(50)).toBeLessThan(powerToIntensity(500));
    expect(powerToIntensity(500)).toBeLessThan(powerToIntensity(2000));
    expect(powerToIntensity(2000)).toBeLessThan(powerToIntensity(4500));
  });
});

describe("intensityToSpeed", () => {
  test("idle baseline of 4 px/s at zero intensity", () => {
    expect(intensityToSpeed(0)).toBe(4);
  });

  test("max of 34 px/s at full intensity", () => {
    expect(intensityToSpeed(1)).toBe(34);
  });

  test("linear between idle and max", () => {
    expect(intensityToSpeed(0.5)).toBe(19);
  });
});

describe("intensityToGap", () => {
  test("starts at 60 px when idle and shrinks to 20 px at full", () => {
    expect(intensityToGap(0)).toBe(60);
    expect(intensityToGap(1)).toBe(20);
  });

  test("monotonically decreases with intensity", () => {
    expect(intensityToGap(0.25)).toBeGreaterThan(intensityToGap(0.75));
  });
});
