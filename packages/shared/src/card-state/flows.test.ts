import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { lineDuration, REFERENCE_LINE_LENGTH } from "./index";

const seconds = fc.double({ min: 0.01, max: 60, noNaN: true });
const pixels = fc.double({ min: 1, max: 2000, noNaN: true });

describe("line duration", () => {
  test("a line of the reference length takes the flow rate's seconds", () => {
    expect(lineDuration(2, REFERENCE_LINE_LENGTH)).toBe(2);
  });

  test("a line a third of the reference length takes a third of the time", () => {
    expect(lineDuration(3, REFERENCE_LINE_LENGTH / 3)).toBeCloseTo(1);
  });

  test("the same flow rate gives the same pixels per second on any line", () => {
    fc.assert(
      fc.property(seconds, pixels, pixels, (rate, short, long) => {
        const speed = (length: number) => length / lineDuration(rate, length);
        expect(speed(short)).toBeCloseTo(speed(long), 6);
      })
    );
  });

  test("a faster flow rate stays faster on every line", () => {
    fc.assert(
      fc.property(seconds, seconds, pixels, (a, b, length) => {
        fc.pre(a < b);
        expect(lineDuration(a, length)).toBeLessThan(lineDuration(b, length));
      })
    );
  });
});
