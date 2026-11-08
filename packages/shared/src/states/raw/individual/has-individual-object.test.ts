import { describe, expect, test } from "vite-plus/test";
import { hasIndividualObject } from "./has-individual-object";

describe("hasIndividualObject", () => {
  test("negative state above tolerance is visible (user-visible bug regression)", () => {
    expect(hasIndividualObject(false, -50, 0)).toBe(true);
  });
});
