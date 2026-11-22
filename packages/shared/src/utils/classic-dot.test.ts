import { describe, expect, test } from "vite-plus/test";
import { classicDotAnimations, type DotRoute, loopProgress } from "./classic-dot";

const route = (shown: boolean[], reverse = false): DotRoute => ({
  points: shown.map((visible, index) => ({ x: index * 10, y: 5, shown: visible })),
  radius: 2,
  reverse,
});

describe("classicDotAnimations", () => {
  test("moves the dot along the route at an even pace, looping from `begin`", () => {
    const { motion, opacity } = classicDotAnimations(route([true, true, true]), 1.5, -0.25);
    expect(motion).toEqual({
      path: "M0 5 L10 5 L20 5",
      calcMode: "paced",
      dur: "1.5s",
      begin: "-0.25s",
      repeatCount: "indefinite",
    });
    expect(opacity).toBeUndefined();
  });

  test("a reversed route runs from its last point to its first", () => {
    const { motion } = classicDotAnimations(route([true, true, true], true), 1, 0);
    expect(motion.path).toBe("M20 5 L10 5 L0 5");
  });

  test("hides the dot where the line's box clips it, in the direction of travel", () => {
    const { opacity } = classicDotAnimations(route([false, true, true], true), 2, 0);
    expect(opacity).toMatchObject({
      attributeName: "opacity",
      values: "1;1;0",
      keyTimes: "0;0.5;1",
      calcMode: "linear",
      dur: "2s",
    });
  });
});

describe("loopProgress", () => {
  test.for([
    [0, 0, 2, 0],
    [1, 0, 2, 0.5],
    [5, 0, 2, 0.5],
    [0, 1, 2, 0.5],
  ] as const)("at %s from %s over %ss is %s", ([now, begin, duration, progress]) => {
    expect(loopProgress(now, begin, duration)).toBeCloseTo(progress);
  });
});
