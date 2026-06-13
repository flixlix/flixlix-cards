import { describe, expect, test } from "vitest";

import { hasIndividualObject } from "../src/states/raw/individual/has-individual-object";
import { adjustZeroTolerance, isAboveTolerance } from "../src/states/tolerance/base";

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

describe("hasIndividualObject", () => {
  test("negative state above tolerance is visible (user-visible bug regression)", () => {
    expect(hasIndividualObject(false, -50, 0)).toBe(true);
  });
});
