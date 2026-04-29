import { describe, expect, test } from "vitest";
import { scalePower } from "../src/utils/format-power";

describe("scalePower", () => {
  test("returns watts and base decimals below the threshold", () => {
    const r = scalePower(750);
    expect(r.value).toBe(750);
    expect(r.unit).toBe("W");
    expect(r.decimals).toBe(0);
  });

  test("switches to kW and kilo decimals at the threshold", () => {
    const r = scalePower(2500);
    expect(r.value).toBe(2.5);
    expect(r.unit).toBe("kW");
    expect(r.decimals).toBe(1);
  });

  test("threshold check uses the absolute value (negative ≥ kilo flips too)", () => {
    const r = scalePower(-1500);
    expect(r.value).toBe(-1.5);
    expect(r.unit).toBe("kW");
  });

  test("custom kilo threshold", () => {
    const below = scalePower(150, { kiloThreshold: 200 });
    const above = scalePower(250, { kiloThreshold: 200 });
    expect(below.unit).toBe("W");
    expect(above.unit).toBe("kW");
  });

  test("custom decimals are honored per scale", () => {
    expect(scalePower(123, { baseDecimals: 2 }).decimals).toBe(2);
    expect(scalePower(2345, { kiloDecimals: 3 }).decimals).toBe(3);
  });

  test("zero stays in watts at default", () => {
    const r = scalePower(0);
    expect(r.value).toBe(0);
    expect(r.unit).toBe("W");
  });
});
