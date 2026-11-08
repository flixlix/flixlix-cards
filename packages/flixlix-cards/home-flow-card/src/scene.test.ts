import { type ChargeLevel } from "@flixlix-cards/shared/utils/severity";
import { mdiBatteryLow } from "@mdi/js";
import { describe, expect, test } from "vite-plus/test";
import {
  type Face,
  fixtures,
  INVERTER,
  type Point,
  type SceneGroup,
  type Shape,
  roundedPath,
  WIRE_ROUTES,
} from "./scene";

const nodesOf = (groups: SceneGroup[]) => groups.map((group) => group.node);

const batteryShapes = (soc: number | null, level?: ChargeLevel): Shape[] =>
  fixtures({ solar: false, battery: { icon: mdiBatteryLow, soc, level } })
    .filter((group) => group.node === "battery")
    .flatMap((group) => group.shapes);

const isChargeBar = (shape: Shape): shape is Face =>
  shape.kind === "face" && shape.fill.startsWith("soc") && shape.fill !== "soc-track";

const chargeBar = (shapes: Shape[]): Face | undefined => shapes.find(isChargeBar);

/** How high the battery's charge bar reaches for a state of charge. */
const fill = (soc: number) =>
  Math.max(...(chargeBar(batteryShapes(soc))?.points.map(([, , z]) => z) ?? []));

describe("house scene", () => {
  test("draws panels and a battery only when they are configured", () => {
    expect(nodesOf(fixtures({ solar: true, battery: { icon: mdiBatteryLow, soc: 0.5 } }))).toEqual([
      "solar",
      "battery",
      "outlet",
      "inverter",
    ]);
    expect(nodesOf(fixtures({ solar: false }))).toEqual(["outlet", "inverter"]);
  });

  test("the battery shows the icon it is given", () => {
    const icons = batteryShapes(0.5).flatMap((shape) =>
      shape.kind === "icon" ? [shape.path] : []
    );

    expect(icons).toEqual([mdiBatteryLow]);
  });

  test("the battery's charge bar fills with its state of charge", () => {
    expect(fill(0.8)).toBeGreaterThan(fill(0.4));
    expect(fill(1.5)).toBe(fill(1));
  });

  test("the charge bar takes its severity colour, or the card's charge colour without one", () => {
    expect(chargeBar(batteryShapes(0.1, "red"))?.fill).toBe("soc-red");
    expect(chargeBar(batteryShapes(0.2, "yellow"))?.fill).toBe("soc-yellow");
    expect(chargeBar(batteryShapes(0.6))?.fill).toBe("soc");
  });

  test("without a state of charge the bar stays empty", () => {
    expect(chargeBar(batteryShapes(null))).toBeUndefined();
  });

  test("a wire's bends are rounded, its ends stay where they are", () => {
    expect(
      roundedPath(
        [
          [0, 0],
          [0, 20],
          [20, 20],
        ],
        4
      )
    ).toBe("M0 0L0 16Q0 20 4 20L20 20");
  });

  test("a bend never rounds more than half of a short segment", () => {
    expect(
      roundedPath(
        [
          [0, 0],
          [0, 2],
          [20, 2],
        ],
        4
      )
    ).toBe("M0 0L0 1Q0 2 1 2L20 2");
  });

  test("every wire ends at the inverter", () => {
    const ends = Object.values(WIRE_ROUTES).flatMap((route): Point[] => route.slice(-1));

    expect(ends).toHaveLength(5);
    for (const [, y, z] of ends) {
      expect(y).toBeGreaterThanOrEqual(INVERTER.y0);
      expect(y).toBeLessThanOrEqual(INVERTER.y1);
      expect(z).toBeGreaterThanOrEqual(INVERTER.z0);
      expect(z).toBeLessThanOrEqual(INVERTER.z1);
    }
  });
});
