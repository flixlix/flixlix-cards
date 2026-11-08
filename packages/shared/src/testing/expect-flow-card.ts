import { expect } from "vite-plus/test";
import { type FlowExpectation } from "./flow-scenarios";
import { type MountedCard } from "./mount-card";

const durationSeconds = (root: ShadowRoot, selector: string) => {
  const duration = root
    .querySelector(selector)
    ?.closest(".flow-dot")
    ?.getAttribute("data-duration");
  if (!duration) {
    throw new Error(`no moving dot at ${selector}`);
  }
  return Number.parseFloat(duration);
};

/** How far an end may sit from half a pixel onto its ring's border, in pixels. */
const RING_TOLERANCE = 0.1;

/** Where each end of every flow line sits relative to the nearest ring: 0 is its outer edge. */
const lineEnds = (root: ShadowRoot) => {
  const rings = [...root.querySelectorAll(".circle")].map((circle) => {
    const box = circle.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2, r: box.width / 2 };
  });
  return [...root.querySelectorAll<SVGPathElement>(".flows path")].flatMap((path) => {
    const matrix = path.getScreenCTM();
    if (!matrix) {
      return [];
    }
    const length = path.getTotalLength();
    return [0, length].map((at) => {
      const point = path.getPointAtLength(at).matrixTransform(matrix);
      const offsets = rings.map(({ x, y, r }) => Math.hypot(point.x - x, point.y - y) - r);
      const nearest = offsets.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a), Infinity);
      return { line: `#${path.id} ${at === 0 ? "start" : "end"}`, offset: nearest };
    });
  });
};

/** Asserts a mounted flow card against a scenario's expectation. */
export const expectFlowCard = (
  { root, text, markup }: MountedCard,
  expectation: FlowExpectation,
  units: (text: string) => string = (same) => same
): void => {
  for (const [selector, expected] of Object.entries(expectation.text ?? {})) {
    expect(text(selector), selector).toBe(units(expected));
  }
  for (const selector of expectation.shown ?? []) {
    expect(root.querySelector(selector), `${selector} shown`).not.toBeNull();
  }
  for (const selector of expectation.hidden ?? []) {
    expect(root.querySelector(selector), `${selector} hidden`).toBeNull();
  }
  for (const [selector, tokens] of Object.entries(expectation.classes ?? {})) {
    const classList = [...(root.querySelector(selector)?.classList ?? [])];
    expect(classList, selector).toEqual(expect.arrayContaining(tokens));
  }
  const durations = (expectation.fastestFirst ?? []).map((selector) =>
    durationSeconds(root, selector)
  );
  const slowerEachStep = durations
    .slice(1)
    .every((duration, index) => (durations[index] ?? Number.POSITIVE_INFINITY) < duration);
  expect(slowerEachStep, `dot durations ${durations.join(" < ")}`).toBe(true);
  expect(markup()).not.toMatch(/NaN|undefined/);
  // Every line meets its circles: half a pixel onto the 2px border, never in the circle.
  for (const { line, offset } of lineEnds(root)) {
    expect(Math.abs(offset + 0.5), `${line} is ${offset.toFixed(2)}px from its ring`).toBeLessThan(
      RING_TOLERANCE
    );
  }
};
