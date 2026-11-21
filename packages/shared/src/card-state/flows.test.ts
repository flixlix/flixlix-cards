import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { lineDuration, REFERENCE_LINE_LENGTH } from "./index";

const seconds = fc.double({ min: 0.01, max: 60, noNaN: true });
const pixels = fc.double({ min: 1, max: 2000, noNaN: true });

describe("line duration", () => {
  test("a line of the reference length takes the flow rate's seconds", () => {
    expect(lineDuration(2, REFERENCE_LINE_LENGTH)).toBe(2);
  });

  test("a line a quarter of the reference length takes half the time", () => {
    expect(lineDuration(3, REFERENCE_LINE_LENGTH / 4)).toBeCloseTo(1.5);
  });

  test("on a shorter line a dot moves fewer pixels per second but loops more often", () => {
    fc.assert(
      fc.property(seconds, pixels, pixels, (rate, a, b) => {
        fc.pre(a < b * 0.999);
        expect(a / lineDuration(rate, a)).toBeLessThan(b / lineDuration(rate, b));
        expect(lineDuration(rate, a)).toBeLessThan(lineDuration(rate, b));
      })
    );
  });

  test("a faster flow rate stays faster on every line", () => {
    fc.assert(
      fc.property(seconds, seconds, pixels, (a, b, length) => {
        fc.pre(a < b * 0.999);
        expect(lineDuration(a, length)).toBeLessThan(lineDuration(b, length));
      })
    );
  });
});
