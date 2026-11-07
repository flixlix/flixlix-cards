import { describe, expect, test } from "vite-plus/test";
import { adjustZeroTolerance, isAboveTolerance } from "./base";

describe("base", () => {
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
});

describe("adjustZeroTolerance", () => {
  test("null input returns 0", () => {
    expect(adjustZeroTolerance(null, 5)).toBe(0);
  });

  test("zero input returns 0", () => {
    expect(adjustZeroTolerance(0, 5)).toBe(0);
  });

  test("positive below tolerance returns 0", () => {
    expect(adjustZeroTolerance(0.5, 5)).toBe(0);
  });

  test("positive at/above tolerance returns value", () => {
    expect(adjustZeroTolerance(7, 5)).toBe(7);
  });

  test("no tolerance returns value unchanged", () => {
    expect(adjustZeroTolerance(7, undefined)).toBe(7);
  });

  test("negative above tolerance (regression: should return -50, not 0)", () => {
    expect(adjustZeroTolerance(-50, 5)).toBe(-50);
  });

  test("negative below tolerance returns 0", () => {
    expect(adjustZeroTolerance(-0.5, 5)).toBe(0);
  });
});

describe("isAboveTolerance", () => {
  test("zero value returns false", () => {
    expect(isAboveTolerance(0, 0)).toBe(false);
  });

  test("negative value above tolerance magnitude (regression: should return true)", () => {
    expect(isAboveTolerance(-50, 0)).toBe(true);
  });
});
