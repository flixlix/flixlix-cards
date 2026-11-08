import { describe, expect, test } from "vite-plus/test";
import { computeNonFossilFromCollection } from "./energy-period";

describe("energy-period", () => {
  test("computeNonFossilFromCollection clamps to zero when fossil exceeds grid", () => {
    expect(computeNonFossilFromCollection({ coal: 2 }, 1000)).toEqual({
      nonFossilEnergy: 0,
      nonFossilPercentage: 0,
    });
  });
});
