import { type ChargeLevel } from "@flixlix-cards/shared/utils/severity";
import { mdiBatteryLow } from "@mdi/js";
import { describe, expect, test } from "vite-plus/test";
import {
  type Face,
  fixtures,
  INVERTER,
  type Point,
  project,
  type SceneGroup,
  type Shape,
  roundedPath,
  WIRE_ROUTES,
  wireRoute,
} from "./scene";
import { labelAnchor } from "./label-anchors";

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

/** The heat pump's lowest point, with or without a car configured. */
const lowest = (car: boolean) =>
  Math.min(
    ...fixtures({ solar: false, heatPump: { layout: { car }, running: false } })
      .filter((group) => group.node === "heat_pump")
      .flatMap((group) => group.shapes)
      .flatMap((shape) => (shape.kind === "face" ? shape.points.map(([, , z]) => z) : []))
  );

/** Where the heat pump's label leader starts on screen, with or without a car. */
const left = (car: boolean) => project(labelAnchor("heat_pump", { car }).at)[0];

/** The heat pump's fan, running or not. */
const fan = (running: boolean) =>
  fixtures({ solar: false, heatPump: { layout: { car: false }, running } })
    .flatMap((group) => group.shapes)
    .find((shape) => shape.kind === "icon");

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

  test("every wire but the car's ends at the inverter", () => {
    const { car: _car, ...toInverter } = WIRE_ROUTES;
    const ends = Object.values(toInverter).flatMap((route): Point[] => route.slice(-1));

    expect(ends).toHaveLength(5);
    for (const [, y, z] of ends) {
      expect(y).toBeGreaterThanOrEqual(INVERTER.y0);
      expect(y).toBeLessThanOrEqual(INVERTER.y1);
      expect(z).toBeGreaterThanOrEqual(INVERTER.z0);
      expect(z).toBeLessThanOrEqual(INVERTER.z1);
    }
  });

  test("the car's and the heat pump's wires end on the outlet's side, opposite the home's wire", () => {
    const homeStart = WIRE_ROUTES.home[0];
    const ends = [
      WIRE_ROUTES.car.at(-1),
      ...[true, false].map((car) => wireRoute("heat_pump", { car }).at(-1)),
    ];

    for (const end of ends) {
      expect(end?.[1]).toBe(homeStart?.[1]);
      expect(end?.[0]).toBeLessThan(homeStart?.[0] ?? 0);
      // on the outlet's plate, which runs from 2.35 to 3.35 up the wall
      expect(end?.[2]).toBeGreaterThanOrEqual(2.35);
      expect(end?.[2]).toBeLessThanOrEqual(3.35);
    }
  });

  test("with a car, the heat pump's wire runs above the car's, never across it", () => {
    const carTop = Math.max(...WIRE_ROUTES.car.map(([, , z]) => z));
    const heatPumpLow = Math.min(...wireRoute("heat_pump", { car: true }).map(([, , z]) => z));

    expect(heatPumpLow).toBeGreaterThan(carTop);
  });

  test("the heat pump hangs lower without a car", () => {
    expect(lowest(false)).toBeLessThan(lowest(true));
  });

  test("the heat pump's label hangs left: up past the car, down into the car's place without one", () => {
    const withCar = labelAnchor("heat_pump", { car: true });
    const alone = labelAnchor("heat_pump", { car: false });

    expect([withCar.side, alone.side]).toEqual(["left", "left"]);
    expect(withCar.leader).toBeLessThan(0);
    expect(alone.leader).toBeGreaterThan(0);
  });

  test("without a car the heat pump moves along the wall to where the car would park", () => {
    expect(left(false)).toBeGreaterThan(left(true));
  });

  test("the heat pump's fan turns only while it runs", () => {
    expect(fan(true)).toMatchObject({ spin: true });
    expect(fan(false)).toMatchObject({ spin: false });
  });
});
