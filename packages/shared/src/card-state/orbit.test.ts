import { describe, expect, test } from "vite-plus/test";
import { ORBIT_NODE_SIZE, orbitGeometry, orbitWidth, type OrbitPoint } from "./orbit";

const distance = (a: OrbitPoint, b: OrbitPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Distance from `point` to the segment between `from` and `to`. */
const distanceToSegment = (point: OrbitPoint, from: OrbitPoint, to: OrbitPoint) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy))
  );
  return distance(point, { x: from.x + t * dx, y: from.y + t * dy });
};

const WIDTHS = [280, 340, 400, 470];
const COUNTS = Array.from({ length: 24 }, (_, index) => index + 1);

describe("orbit geometry", () => {
  test("places exactly one point per device", () => {
    for (const count of [0, 1, 5, 11, 24]) {
      expect(orbitGeometry(400, count).devices).toHaveLength(count);
    }
  });

  test("the first device is straight above the home", () => {
    const { home, devices } = orbitGeometry(400, 7);
    expect(devices[0]?.x).toBeCloseTo(home.x, 6);
    expect(devices[0]?.y).toBeLessThan(home.y);
  });

  test("the home is centred in the box", () => {
    for (const width of WIDTHS) {
      const geometry = orbitGeometry(width, 6);
      expect(geometry.home.x).toBeCloseTo(geometry.width / 2, 6);
    }
  });

  test("a card that has not been measured is laid out at a default width", () => {
    expect(orbitGeometry(0, 5)).toEqual(orbitGeometry(400, 5));
    expect(orbitWidth(0)).toBe(400);
    expect(orbitWidth(900)).toBe(470);
  });

  test("a handful of devices keep full-size circles", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      expect(orbitGeometry(400, count).scale).toBe(1);
    }
  });

  test("circles shrink as devices are added, never grow", () => {
    let previous = 1;
    for (const count of COUNTS) {
      const { scale } = orbitGeometry(400, count);
      expect(scale).toBeLessThanOrEqual(previous + 1e-9);
      previous = scale;
    }
  });

  describe.each(WIDTHS)("at %ipx", (width) => {
    test.each(COUNTS)(
      "%i devices: nothing overlaps and every device is inside the box",
      (count) => {
        const geometry = orbitGeometry(width, count);
        const { devices, home, scale } = geometry;
        const diameter = ORBIT_NODE_SIZE * scale;
        const radius = diameter / 2;

        for (const point of devices) {
          // Inside the box, unless the box had to grow because the devices did not fit.
          expect(point.x - radius).toBeGreaterThanOrEqual(-0.01);
          expect(point.x + radius).toBeLessThanOrEqual(geometry.width + 0.01);
          expect(point.y - radius).toBeGreaterThanOrEqual(-0.01);
          expect(point.y + radius).toBeLessThanOrEqual(geometry.height + 0.01);
          // Clear of the home, with room for a line between them.
          expect(distance(point, home)).toBeGreaterThanOrEqual(ORBIT_NODE_SIZE / 2 + radius + 20);
        }

        devices.forEach((point, index) => {
          devices.slice(index + 1).forEach((other) => {
            expect(distance(point, other)).toBeGreaterThanOrEqual(diameter + 8);
          });
        });

        // A line from the home to one device never runs through another device's circle.
        const passed = devices.flatMap((target, index) =>
          devices
            .filter((_, otherIndex) => otherIndex !== index)
            .map((other) => ({ other, target }))
        );
        for (const { other, target } of passed) {
          expect(distanceToSegment(other, home, target)).toBeGreaterThan(radius + 2);
        }
      }
    );
  });

  test("fits the devices inside the card width up to 20 devices at 400px", () => {
    for (const count of COUNTS.filter((value) => value <= 20)) {
      expect(orbitGeometry(400, count).width).toBe(400);
    }
  });

  test("a very crowded card grows the box and shrinks it back to fit instead of overlapping", () => {
    const geometry = orbitGeometry(280, 60);
    expect(geometry.width).toBeGreaterThan(280);
    expect(geometry.fit).toBeCloseTo(280 / geometry.width, 6);
    expect(geometry.width * geometry.fit).toBeCloseTo(280, 6);
  });

  test("a box that fits the card is not shrunk", () => {
    expect(orbitGeometry(400, 11).fit).toBe(1);
  });
});
