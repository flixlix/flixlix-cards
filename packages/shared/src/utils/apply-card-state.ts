import { lineDuration, type ReadyCardState } from "@flixlix-cards/shared/card-state";

/** Points sampled along a line; the dot moves straight between them. */
const SAMPLES = 40;

/** A dot's way along its line, in the dot's own pixels. */
type Route = {
  points: { x: number; y: number; shown: boolean }[];
  radius: number;
  reverse: boolean;
};

/**
 * Each dot's running motion and the route it was built from. `getAnimations()` is missing before
 * Chrome 84.
 */
const motions = new WeakMap<SVGSVGElement, { animation: Animation; route: Route }>();

/** Measuring a moving dot is off by float noise; any real layout change moves it further. */
const SAME_PLACE_PIXELS = 0.5;

const sameRoute = (a: Route, b: Route) =>
  a.reverse === b.reverse &&
  Math.abs(a.radius - b.radius) < SAME_PLACE_PIXELS &&
  a.points.length === b.points.length &&
  a.points.every((point, index) => {
    const other = b.points[index];
    return (
      other !== undefined &&
      point.shown === other.shown &&
      Math.hypot(point.x - other.x, point.y - other.y) < SAME_PLACE_PIXELS
    );
  });

/** How far through its loop a dot is, from 0 to 1, stopping its current motion. */
const stopDot = (dot: SVGSVGElement): number => {
  const running = motions.get(dot);
  if (!running) {
    return 0;
  }
  const duration = Number(running.animation.effect?.getTiming().duration);
  const time = Number(running.animation.currentTime ?? 0);
  running.animation.cancel();
  motions.delete(dot);
  return duration > 0 ? (time % duration) / duration : 0;
};

/**
 * The dot's screen matrix without the translation its own motion adds, so a moving dot measures
 * the same as a still one.
 */
const restingScreenCTM = (dot: SVGSVGElement) => {
  const placed = dot.getScreenCTM();
  const transform = getComputedStyle(dot).transform;
  if (!placed || transform === "none") {
    return placed;
  }
  return DOMMatrix.fromMatrix(placed).multiply(new DOMMatrix(transform).inverse());
};

/** The dot's route along its path, or nothing while it has no layout. */
const dotMotion = (root: ShadowRoot, dot: SVGSVGElement) => {
  const path = root.getElementById(dot.dataset.path ?? "");
  if (!(path instanceof SVGPathElement)) {
    return undefined;
  }
  const toDot = restingScreenCTM(dot)?.inverse();
  const fromPath = path.getScreenCTM();
  const line = path.ownerSVGElement;
  const length = path.getTotalLength();
  if (!toDot || !fromPath || !line || !(length > 0)) {
    return undefined;
  }
  // A line's SVG that clips hides the part of the path outside its box; the dot fades out there.
  const box =
    getComputedStyle(line).overflow === "visible" ? undefined : line.getBoundingClientRect();
  const toPixels = toDot.multiply(fromPath);
  const points = Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const point = path.getPointAtLength((length * index) / SAMPLES);
    const onScreen = point.matrixTransform(fromPath);
    const { x, y } = DOMPoint.fromPoint(point).matrixTransform(toPixels);
    const shown =
      !box ||
      (onScreen.x >= box.left &&
        onScreen.x <= box.right &&
        onScreen.y >= box.top &&
        onScreen.y <= box.bottom);
    return { x, y, shown };
  });
  const pixelsPerUnit = Math.hypot(toPixels.a, toPixels.b);
  const route: Route = {
    points,
    radius: Number(dot.dataset.radius) * pixelsPerUnit,
    reverse: dot.hasAttribute("data-reverse"),
  };
  return { route, lengthPixels: length * pixelsPerUnit };
};

/**
 * Moves every flow dot along its line at an even pace. `data-duration` is seconds per reference
 * line, stretched to the line's length (`lineDuration`).
 *
 * A dot whose route is unchanged keeps its running animation, and a new speed only changes its
 * playback rate: cancelling a compositor animation and starting another makes Chromium redraw the
 * dot where the main thread last saw it, a step back on every state update (#478). A dot only
 * starts over, from the same place on its line, when its route or direction changes.
 */
const animateFlowDots = (root: ShadowRoot): void => {
  if (typeof Element.prototype.animate !== "function") {
    return;
  }
  for (const dot of root.querySelectorAll<SVGSVGElement>("svg.flow-dot")) {
    const motion = dotMotion(root, dot);
    const duration = motion
      ? lineDuration(Number(dot.dataset.duration), motion.lengthPixels) * 1000
      : 0;
    if (!motion || !(duration > 0)) {
      stopDot(dot);
      continue;
    }
    const { route } = motion;
    const running = motions.get(dot);
    if (running && running.animation.playState !== "idle" && sameRoute(running.route, route)) {
      const built = Number(running.animation.effect?.getTiming().duration);
      const rate = built / duration;
      if (Math.abs(rate - running.animation.playbackRate) > 1e-6) {
        running.animation.updatePlaybackRate(rate);
      }
      continue;
    }
    const progress = stopDot(dot);
    dot.firstElementChild?.setAttribute("r", String(route.radius));
    const keyframes = route.points.map(({ x, y, shown }) => ({
      transform: `translate(${x}px, ${y}px)`,
      opacity: shown ? 1 : 0,
    }));
    const animation = dot.animate(keyframes, {
      duration,
      iterations: Infinity,
      direction: route.reverse ? "reverse" : "normal",
    });
    animation.currentTime = progress * duration;
    motions.set(dot, { animation, route });
  }
};

/** Applies the parts of a card state that live outside the rendered template. */
export const applyCardState = (host: HTMLElement, state: ReadyCardState): void => {
  for (const [name, value] of Object.entries(state.cssVars)) {
    host.style.setProperty(name, value);
  }
  if (host.shadowRoot) {
    animateFlowDots(host.shadowRoot);
  }
};
