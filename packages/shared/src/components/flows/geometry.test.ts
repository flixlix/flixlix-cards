import * as fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import {
  type FlowLayout,
  flowPaths,
  nominalLayout,
  type Point,
  RING_INSET,
  type Ring,
} from "./geometry";

/** Points along `M x,y L x,y C x,y x,y x,y` path data, every few hundredths of a segment. */
const sample = (d: string): Point[] => {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const commands = d.match(/[MLC]/g) ?? [];
  const points: Point[] = [];
  let index = 0;
  let from: Point = { x: 0, y: 0 };
  const next = (): Point => {
    const point = { x: numbers[index] ?? Number.NaN, y: numbers[index + 1] ?? Number.NaN };
    index += 2;
    return point;
  };
  for (const command of commands) {
    if (command === "M") {
      from = next();
      points.push(from);
    } else {
      const controls = command === "C" ? [next(), next()] : [];
      const to = next();
      const [c1 = from, c2 = to] = controls;
      for (let step = 1; step <= 50; step += 1) {
        const t = step / 50;
        const u = 1 - t;
        points.push({
          x: u ** 3 * from.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * to.x,
          y: u ** 3 * from.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * to.y,
        });
      }
      from = to;
    }
  }
  return points;
};

const distance = (point: Point, { cx, cy }: Ring) => Math.hypot(point.x - cx, point.y - cy);

/** Rounding the path data to hundredths moves an end by at most this much. */
const ROUNDING = 0.01;

const ends = (layout: FlowLayout) => {
  const { home, grid, solar, battery, rightTop, rightBottom } = layout;
  return {
    solarToHome: [solar, home],
    solarToGrid: [solar, grid],
    solarToBattery: [solar, battery],
    gridToHome: [grid, home],
    batteryToHome: [battery, home],
    batteryToGrid: [battery, grid],
    rightTopToHome: [rightTop, home],
    rightBottomToHome: [rightBottom, home],
  } as const;
};

const nodeSets = fc.record({
  grid: fc.boolean(),
  solar: fc.boolean(),
  battery: fc.boolean(),
  right: fc.boolean(),
});

/** How far the grid line runs from the home's axis. */
const axisOf = (nodes: { solar: boolean; battery: boolean }) => {
  const layout = nominalLayout(400, { grid: true, right: false, ...nodes });
  const start = sample(flowPaths(layout, { hasBottomRow: nodes.battery }).gridToHome?.d ?? "")[0];
  return (start?.y ?? Number.NaN) - layout.home.cy;
};

const startX = (line: { d: string } | undefined) => sample(line?.d ?? "")[0]?.x ?? Number.NaN;

describe("flow paths", () => {
  test("every line starts and ends on the border of its rings, at every width", () => {
    fc.assert(
      fc.property(fc.integer({ min: 240, max: 640 }), nodeSets, (width, nodes) => {
        const layout = nominalLayout(width, nodes);
        const paths = flowPaths(layout, { hasBottomRow: nodes.battery || nodes.right });
        for (const [flow, [from, to]] of Object.entries(ends(layout))) {
          const line = paths[flow as keyof typeof paths];
          const d = typeof line === "object" ? line.d : undefined;
          if (!d || !from || !to) {
            continue;
          }
          const points = sample(d);
          const first = points[0];
          const last = points[points.length - 1];
          if (!first || !last) {
            throw new Error(`${flow}: empty path`);
          }
          expect(Math.abs(distance(first, from) - (from.r - RING_INSET))).toBeLessThan(ROUNDING);
          expect(Math.abs(distance(last, to) - (to.r - RING_INSET))).toBeLessThan(ROUNDING);
        }
      })
    );
  });

  test("no line runs into the inside of any circle", () => {
    fc.assert(
      fc.property(fc.integer({ min: 240, max: 640 }), nodeSets, (width, nodes) => {
        const layout = nominalLayout(width, nodes);
        const paths = flowPaths(layout, { hasBottomRow: nodes.battery || nodes.right });
        const rings = Object.values(ends(layout))
          .flat()
          .filter((candidate) => candidate !== undefined);
        for (const flow of Object.keys(ends(layout))) {
          const line = paths[flow as keyof typeof paths];
          const d = typeof line === "object" ? line.d : undefined;
          if (!d) {
            continue;
          }
          for (const point of sample(d)) {
            for (const circle of rings) {
              expect(distance(point, circle), flow).toBeGreaterThan(
                circle.r - RING_INSET - ROUNDING
              );
            }
          }
        }
      })
    );
  });

  test("lines into a node are centred on its axis", () => {
    const layout = nominalLayout(300, { grid: true, solar: true, battery: true, right: false });
    const paths = flowPaths(layout, { hasBottomRow: true });
    const hub = layout.hub.x;
    expect(startX(paths.solarToBattery)).toBeCloseTo(hub, 2);
    expect(startX(paths.solarToHome) - hub).toBeCloseTo(hub - startX(paths.solarToGrid), 2);
    expect(startX(paths.batteryToHome) - hub).toBeCloseTo(hub - startX(paths.batteryToGrid), 2);
  });

  test("the grid line runs on the home's axis unless a solar line takes it", () => {
    expect(axisOf({ solar: false, battery: false })).toBeCloseTo(0, 2);
    expect(axisOf({ solar: false, battery: true })).toBeCloseTo(0, 2);
    expect(axisOf({ solar: true, battery: true })).toBeCloseTo(0, 2);
    expect(axisOf({ solar: true, battery: false })).toBeGreaterThan(5);
  });

  test("a reversed line is the same line, run from its other end", () => {
    const layout = nominalLayout(360, { grid: true, solar: true, battery: true, right: true });
    for (const line of Object.values(flowPaths(layout, { hasBottomRow: true }))) {
      if (typeof line !== "object") {
        continue;
      }
      const forwards = sample(line.d);
      const backwards = sample(line.reversed);
      expect(backwards).toHaveLength(forwards.length);
      for (const [index, point] of forwards.entries()) {
        const mirrored = backwards[backwards.length - 1 - index];
        expect(mirrored?.x).toBeCloseTo(point.x, 1);
        expect(mirrored?.y).toBeCloseTo(point.y, 1);
      }
    }
  });

  test("keeps the proportions of a wide card", () => {
    // A 500px card: one line unit is 3.14px; the card has always drawn it at 3.15px.
    const layout = nominalLayout(498, { grid: true, solar: true, battery: true, right: false });
    expect(flowPaths(layout, { hasBottomRow: true }).scale).toBeCloseTo(3.15, 1);
  });
});
