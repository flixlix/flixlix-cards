import { describe, expect, test } from "vite-plus/test";
import { type Face, fixtures, INVERTER, type Point, type SceneGroup, WIRE_ROUTES } from "./scene";

const nodesOf = (groups: SceneGroup[]) => groups.map((group) => group.node);

const facesOf = (groups: SceneGroup[], node: SceneGroup["node"], fill: string): Face[] =>
  groups
    .filter((group) => group.node === node)
    .flatMap((group) => group.shapes)
    .filter((shape): shape is Face => shape.kind === "face" && shape.fill === fill);

const topOf = (face: Face | undefined) => Math.max(...(face?.points.map(([, , z]) => z) ?? []));

/** How high the battery's charge bar reaches for a state of charge. */
const fill = (soc: number) => {
  const groups = fixtures({ solar: false, battery: true, soc });
  return topOf(facesOf(groups, "battery", "soc")[0] ?? facesOf(groups, "battery", "soc-low")[0]);
};

describe("house scene", () => {
  test("draws panels and a battery only when they are configured", () => {
    expect(nodesOf(fixtures({ solar: true, battery: true, soc: 0.5 }))).toEqual([
      "solar",
      "battery",
      "outlet",
      "inverter",
    ]);
    expect(nodesOf(fixtures({ solar: false, battery: false, soc: null }))).toEqual([
      "outlet",
      "inverter",
    ]);
  });

  test("the battery's charge bar fills with its state of charge", () => {
    expect(fill(0.8)).toBeGreaterThan(fill(0.4));
    expect(fill(1.5)).toBe(fill(1));
  });

  test("a nearly empty battery shows its bar in the low colour", () => {
    const groups = fixtures({ solar: false, battery: true, soc: 0.1 });

    expect(facesOf(groups, "battery", "soc")).toEqual([]);
    expect(facesOf(groups, "battery", "soc-low")).toHaveLength(1);
  });

  test("without a state of charge the bar stays empty", () => {
    const groups = fixtures({ solar: false, battery: true, soc: null });

    expect(facesOf(groups, "battery", "soc-track")).toHaveLength(1);
    expect([
      ...facesOf(groups, "battery", "soc"),
      ...facesOf(groups, "battery", "soc-low"),
    ]).toEqual([]);
  });

  test("every wire ends at the inverter", () => {
    const ends = Object.values(WIRE_ROUTES).flatMap((route): Point[] => route.slice(-1));

    expect(ends).toHaveLength(4);
    for (const [, y, z] of ends) {
      expect(y).toBeGreaterThanOrEqual(INVERTER.y0);
      expect(y).toBeLessThanOrEqual(INVERTER.y1);
      expect(z).toBeGreaterThanOrEqual(INVERTER.z0);
      expect(z).toBeLessThanOrEqual(INVERTER.z1);
    }
  });
});
