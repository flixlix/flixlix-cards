import { describe, expect, test } from "vite-plus/test";
import { reversePath } from "./reverse-path";

describe("reversePath", () => {
  test("a curved line runs from its end back to its start through the same control points", () => {
    expect(reversePath("M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20")).toBe(
      "M-5,55 h20 c20,0 30,0 30,30 v15"
    );
  });

  test("a straight line swaps its ends", () => {
    expect(reversePath("M40 -10 v50")).toBe("M40,40 v-50");
  });

  test.for([
    "M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20",
    "M45,0 v15 c0,30 -10,30 -30,30 h-20",
    "M47,0 v15 c0,35 -10,35 -30,35 h-20",
    "M40,40 v-40",
  ])("reversing %s twice gives it back", (d) => {
    expect(reversePath(reversePath(d))).toBe(d);
  });

  test.for(["M0,0 l10,10", "M0,0 C1,2 3,4 5,6", "m0,0 v10", "M0,0 c1,2 3,4"])(
    "rejects %s, which it cannot reverse",
    (d) => {
      expect(() => reversePath(d)).toThrow(d);
    }
  );
});
