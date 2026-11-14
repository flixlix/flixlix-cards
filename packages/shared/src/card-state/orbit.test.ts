import {
  CARD_CONTENT_PADDING,
  ORBIT_NODE_SIZE,
  type OrbitGeometry,
  type OrbitPoint,
  type OrbitRect,
  orbitGeometry,
  orbitLabelRect,
  orbitWidth,
} from "@flixlix-cards/shared/card-state";
import { describe, expect, test } from "vite-plus/test";

const CARD_WIDTHS = [320, 360, 420, 502];
const COUNTS = Array.from({ length: 24 }, (_, index) => index + 1);
const SAMPLES = 120;

const distance = (a: OrbitPoint, b: OrbitPoint) => Math.hypot(a.x - b.x, a.y - b.y);

const distanceToRect = (point: OrbitPoint, rect: OrbitRect) =>
  Math.hypot(
    Math.max(rect.left - point.x, 0, point.x - rect.right),
    Math.max(rect.top - point.y, 0, point.y - rect.bottom)
  );

const rectsOverlap = (a: OrbitRect, b: OrbitRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Points along the line from the home to a device. */
const along = (from: OrbitPoint, to: OrbitPoint) =>
  Array.from({ length: SAMPLES + 1 }, (_, index) => ({
    x: from.x + ((to.x - from.x) * index) / SAMPLES,
    y: from.y + ((to.y - from.y) * index) / SAMPLES,
  }));

/** What touches what in a layout, one sentence per problem; an empty list is a clean layout. */
const problems = (geometry: OrbitGeometry): string[] => {
  const { devices, home, scale } = geometry;
  const radius = (ORBIT_NODE_SIZE * scale) / 2;
  const labels = devices.map((device) => orbitLabelRect(device, scale));
  const found: string[] = [];

  devices.forEach((device, index) => {
    const box = { left: 0, top: 0, right: geometry.width, bottom: geometry.height };
    const inside = (rect: OrbitRect) =>
      rect.left >= box.left - 0.01 &&
      rect.right <= box.right + 0.01 &&
      rect.top >= box.top - 0.01 &&
      rect.bottom <= box.bottom + 0.01;
    const circle = {
      left: device.x - radius,
      right: device.x + radius,
      top: device.y - radius,
      bottom: device.y + radius,
    };
    if (!inside(circle) || !inside(labels[index] as OrbitRect)) {
      found.push(`device ${index} is outside the box`);
    }
    if (distanceToRect(home, labels[index] as OrbitRect) < ORBIT_NODE_SIZE / 2) {
      found.push(`name ${index} touches the home`);
    }
    devices.forEach((other, otherIndex) => {
      if (otherIndex === index) {
        return;
      }
      if (otherIndex > index && distance(device, other) < 2 * radius + 8) {
        found.push(`circles ${index} and ${otherIndex} touch`);
      }
      if (distanceToRect(other, labels[index] as OrbitRect) < radius + 2) {
        found.push(`name ${index} touches circle ${otherIndex}`);
      }
      if (
        otherIndex > index &&
        rectsOverlap(labels[index] as OrbitRect, labels[otherIndex] as OrbitRect)
      ) {
        found.push(`names ${index} and ${otherIndex} overlap`);
      }
      // The line from the home to a device, past the home's circle and short of its own.
      const line = along(home, device).filter(
        (point) => distance(point, home) > ORBIT_NODE_SIZE / 2 && distance(point, device) > radius
      );
      if (line.some((point) => distance(point, other) < radius + 2)) {
        found.push(`line to ${index} crosses circle ${otherIndex}`);
      }
      if (line.some((point) => distanceToRect(point, labels[otherIndex] as OrbitRect) < 2)) {
        found.push(`line to ${index} crosses name ${otherIndex}`);
      }
    });
    const own = along(home, device).filter(
      (point) => distance(point, home) > ORBIT_NODE_SIZE / 2 && distance(point, device) > radius
    );
    if (own.some((point) => distanceToRect(point, labels[index] as OrbitRect) < 2)) {
      found.push(`line to ${index} crosses its own name`);
    }
  });
  return found;
};

describe("orbit geometry", () => {
  test("places exactly one point per device", () => {
    for (const count of [0, 1, 5, 11, 24]) {
      expect(orbitGeometry(420, count).devices).toHaveLength(count);
    }
  });

  test("the first device is straight above the home", () => {
    const { home, devices } = orbitGeometry(420, 7);
    expect(devices[0]?.x).toBeCloseTo(home.x, 6);
    expect(devices[0]?.y).toBeLessThan(home.y);
  });

  test("names sit above the circles in the upper half and below them elsewhere", () => {
    const { home, devices } = orbitGeometry(420, 8);
    for (const device of devices) {
      expect(device.labelAbove).toBe(device.y < home.y - 1);
    }
  });

  test("a card that has not been measured is laid out at a default width", () => {
    expect(orbitGeometry(0, 5)).toEqual(orbitGeometry(400, 5));
  });

  test("the orbit is as wide as the card's content, which Home Assistant pads", () => {
    expect(orbitWidth(420)).toBe(420 - 2 * CARD_CONTENT_PADDING);
    expect(orbitWidth(900)).toBe(470);
  });

  test("a handful of devices keep full-size circles", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      expect(orbitGeometry(420, count).scale).toBe(1);
    }
  });

  test("eleven devices fit one ring on a phone-sized card", () => {
    const geometry = orbitGeometry(420, 11);
    expect(geometry.rings).toBe(1);
    expect(geometry.scale).toBeGreaterThanOrEqual(0.7);
  });

  test("circles shrink as devices are added, never grow", () => {
    for (const cardWidth of CARD_WIDTHS) {
      const scales = COUNTS.map((count) => orbitGeometry(cardWidth, count).scale);
      const grows = scales.filter(
        (scale, index) => index > 0 && scale > (scales[index - 1] ?? 1) + 1e-9
      );
      expect(grows).toEqual([]);
    }
  });

  describe.each(CARD_WIDTHS)("on a card %ipx wide", (cardWidth) => {
    test.each(COUNTS)("%i devices: nothing touches and nothing is cut off", (count) => {
      const geometry = orbitGeometry(cardWidth, count);

      expect(problems(geometry)).toEqual([]);
      // The box is drawn inside the padding Home Assistant puts around the card content.
      expect(geometry.width * geometry.fit).toBeLessThanOrEqual(
        cardWidth - 2 * CARD_CONTENT_PADDING + 1e-6
      );
    });
  });

  test("a very crowded card is shrunk to fit instead of overlapping", () => {
    const geometry = orbitGeometry(320, 60);
    expect(geometry.fit).toBeLessThan(1);
    expect(geometry.width * geometry.fit).toBeCloseTo(orbitWidth(320), 6);
    expect(problems(geometry)).toEqual([]);
  });

  test("a box that fits the card is not shrunk", () => {
    expect(orbitGeometry(420, 11).fit).toBe(1);
  });
});
