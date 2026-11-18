import { describe, expect, test } from "vite-plus/test";
import { outlinePath, packOutlines } from "./car-outline";

describe("packed outlines", () => {
  test("unpack to closed paths, each point a step from the one before", () => {
    const triangle = [
      [10, 20],
      [15, 20],
      [10, 12],
    ] as const;
    const square = [
      [0, 0],
      [30, 0],
      [30, 30],
      [0, 30],
    ] as const;

    expect(outlinePath(packOutlines([triangle, square]))).toBe(
      "M1 2l0.5 0l-0.5 -0.8zM0 0l3 0l0 3l-3 0z"
    );
  });

  test("keep steps too long for one symbol, either way", () => {
    const wide = [
      [650, 480],
      [0, 480],
      [650, 0],
    ] as const;

    expect(outlinePath(packOutlines([wide]))).toBe("M65 48l-65 0l65 -48z");
  });

  test("need no escaping in a string", () => {
    const steps = Array.from({ length: 200 }, (_, i) => [i * 3, (i * 7) % 90] as const);

    expect(packOutlines([steps])).not.toMatch(/[\\"\s]/);
  });

  test("nothing packs to no path", () => {
    expect(outlinePath(packOutlines([]))).toBe("");
  });
});
