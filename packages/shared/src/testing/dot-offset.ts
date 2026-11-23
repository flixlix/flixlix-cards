import { expect } from "vite-plus/test";

const SAMPLES_ON_LINE = 400;
const STEPS_PER_LOOP = 12;

const centerOf = (element: Element) => {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** A classic dot outside the box of the line's SVG that clips it. */
const clippedAway = (circle: SVGCircleElement) => {
  const svg = circle.ownerSVGElement;
  if (!svg || !circle.classList.contains("classic-dot")) {
    return false;
  }
  const box = svg.getBoundingClientRect();
  const { x, y } = centerOf(circle);
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
};

/** Points along a line, on screen. */
const lineOnScreen = (path: SVGPathElement) => {
  const matrix = path.getScreenCTM();
  if (!matrix) {
    throw new Error(`#${path.id} is not rendered`);
  }
  const length = path.getTotalLength();
  return Array.from({ length: SAMPLES_ON_LINE + 1 }, (_, index) =>
    DOMPoint.fromPoint(path.getPointAtLength((length * index) / SAMPLES_ON_LINE)).matrixTransform(
      matrix
    )
  );
};

/**
 * A GPU dot's `<circle>`, or the one a classic dot is drawn as in its line's SVG: the one on the
 * same line with the same classes, since a line can carry a dot each way.
 */
export const dotCircle = (root: ShadowRoot, dot: SVGSVGElement): SVGCircleElement => {
  const own = dot.querySelector("circle");
  const classic = [
    ...root.querySelectorAll<SVGCircleElement>(
      `circle.classic-dot[data-path="${dot.dataset.path ?? ""}"]`
    ),
  ].find(
    (circle) => circle.getAttribute("class") === `classic-dot ${own?.getAttribute("class") ?? ""}`
  );
  const circle = classic ?? own;
  if (!circle) {
    throw new Error(`the dot on #${dot.dataset.path ?? ""} has no circle`);
  }
  return circle;
};

/** Moves a GPU or a classic dot to a point in its loop, from 0 to 1, and pauses it there. */
const seek = (dot: SVGSVGElement, circle: SVGCircleElement, progress: number) => {
  const [animation] = dot.getAnimations();
  if (animation) {
    animation.pause();
    animation.currentTime = Number(animation.effect?.getTiming().duration) * progress;
    return;
  }
  const motion = circle.querySelector("animateMotion");
  const timeline = circle.ownerSVGElement;
  if (!(motion instanceof SVGAnimationElement) || !timeline) {
    throw new Error(`the dot on #${dot.dataset.path ?? ""} does not move`);
  }
  timeline.pauseAnimations();
  // A dot that carried on from mid-loop began before its SVG's timeline did; times before 0 are
  // before the motion and leave the dot at its line's origin.
  const loop = motion.getSimpleDuration();
  const time = motion.getStartTime() + loop * progress;
  timeline.setCurrentTime(time < 0 ? time + loop * Math.ceil(-time / loop) : time);
};

/**
 * How far on screen, in pixels, each flow dot strays from its line over one loop, keyed by the
 * line. Pauses the dots. Where a line's SVG clips, the dot is hidden and left out.
 */
export const dotOffsets = (root: ShadowRoot): Map<string, number> =>
  new Map(
    [...root.querySelectorAll<SVGSVGElement>("svg.flow-dot")].map((dot) => {
      const path = root.getElementById(dot.dataset.path ?? "");
      const circle = dotCircle(root, dot);
      if (!(path instanceof SVGPathElement)) {
        throw new Error(`the dot on #${dot.dataset.path ?? ""} has no line`);
      }
      const line = lineOnScreen(path);
      const offsets = Array.from({ length: STEPS_PER_LOOP }, (_, step) => {
        // Mid-step, clear of the loop's start, which float rounding can put just before the motion.
        seek(dot, circle, (step + 0.5) / STEPS_PER_LOOP);
        if (Number(getComputedStyle(dot).opacity) === 0 || clippedAway(circle)) {
          return 0;
        }
        const { x, y } = centerOf(circle);
        return Math.min(...line.map((point) => Math.hypot(point.x - x, point.y - y)));
      });
      return [path.id, Math.max(...offsets)];
    })
  );

/** How far a dot may sit from its line on screen: its sampled route cuts corners by less. */
const ON_LINE_PIXELS = 0.5;

/** Asserts the card has moving dots and that each one runs on its line over a whole loop. */
export const expectDotsOnLines = (root: ShadowRoot): void => {
  const offsets = dotOffsets(root);
  expect(offsets.size).toBeGreaterThan(0);
  for (const [line, offset] of offsets) {
    expect(offset, `dot on #${line}`).toBeLessThan(ON_LINE_PIXELS);
  }
};
