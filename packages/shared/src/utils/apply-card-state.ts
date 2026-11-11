import { lineDuration, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import {
  classicDotAnimations,
  type DotRoute,
  loopProgress,
} from "@flixlix-cards/shared/utils/classic-dot";
import { type DotAnimation, resolveDotAnimation } from "@flixlix-cards/shared/utils/dot-animation";

/** Points sampled along a line; the dot moves straight between them. */
const SAMPLES = 40;

type Route = DotRoute;

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

const SVG_NS = "http://www.w3.org/2000/svg";

/** Each classic dot's route and timing, in seconds of its own `<svg>`'s timeline. */
const classicMotions = new WeakMap<
  SVGSVGElement,
  { route: Route; duration: number; begin: number }
>();

/** How far through its loop a classic dot is, from 0 to 1, stopping its current motion. */
const stopClassicDot = (dot: SVGSVGElement): number => {
  const running = classicMotions.get(dot);
  for (const animation of dot.querySelectorAll("animateMotion, animate")) {
    animation.remove();
  }
  classicMotions.delete(dot);
  if (!running) {
    return 0;
  }
  return loopProgress(dot.getCurrentTime(), running.begin, running.duration);
};

const smil = (tag: "animateMotion" | "animate", attributes: Record<string, string>) => {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
};

/** Moves a dot with SVG animation, as before 0.4.0: on the main thread, with no GPU layers. */
const moveClassicDot = (dot: SVGSVGElement, route: Route, duration: number, progress: number) => {
  const begin = dot.getCurrentTime() - progress * duration;
  const { motion, opacity } = classicDotAnimations(route, duration, begin);
  const circle = dot.firstElementChild;
  circle?.setAttribute("r", String(route.radius));
  circle?.append(smil("animateMotion", motion));
  if (opacity) {
    circle?.append(smil("animate", opacity));
  }
  classicMotions.set(dot, { route, duration, begin });
};

/** Like a GPU dot, a classic dot carries on from the same place when its speed or route changes. */
const animateClassicDot = (dot: SVGSVGElement, route: Route, duration: number) => {
  const running = classicMotions.get(dot);
  if (running && sameRoute(running.route, route) && Math.abs(running.duration - duration) < 1e-6) {
    return;
  }
  moveClassicDot(dot, route, duration, stopClassicDot(dot));
};

/** Moves a dot with Web Animations, which Chromium and WebKit run off the main thread. */
const animateGpuDot = (dot: SVGSVGElement, route: Route, duration: number) => {
  const running = motions.get(dot);
  if (running && running.animation.playState !== "idle" && sameRoute(running.route, route)) {
    const built = Number(running.animation.effect?.getTiming().duration);
    const rate = built / duration;
    if (Math.abs(rate - running.animation.playbackRate) > 1e-6) {
      running.animation.updatePlaybackRate(rate);
    }
    return;
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
};

/**
 * Moves every flow dot along its line at an even pace. `data-duration` is seconds per reference
 * line, stretched to the line's length (`lineDuration`).
 *
 * A dot whose route is unchanged keeps its running animation, and a new speed only changes its
 * playback rate: cancelling a compositor animation and starting another makes Chromium redraw the
 * dot where the main thread last saw it, a step back on every state update (#478). A dot only
 * starts over, from the same place on its line, when its route or direction changes.
 *
 * Browsers without Web Animations (before Chrome 84) get classic dots.
 */
const animateFlowDots = (root: ShadowRoot, animation: DotAnimation): void => {
  const mode = typeof Element.prototype.animate === "function" ? animation : "classic";
  for (const dot of root.querySelectorAll<SVGSVGElement>("svg.flow-dot")) {
    const motion = dotMotion(root, dot);
    const seconds = motion ? lineDuration(Number(dot.dataset.duration), motion.lengthPixels) : 0;
    if (!motion || !(seconds > 0)) {
      stopDot(dot);
      stopClassicDot(dot);
      continue;
    }
    if (mode === "classic") {
      stopDot(dot);
      animateClassicDot(dot, motion.route, seconds);
    } else {
      stopClassicDot(dot);
      animateGpuDot(dot, motion.route, seconds * 1000);
    }
  }
};

/** The CSS variables each host was last given, so ones a later state drops can be removed. */
const appliedCssVars = new WeakMap<HTMLElement, string[]>();

/**
 * Sets the state's CSS variables on the host and removes the ones the previous state set and this
 * one leaves out, such as an idle circle's grey once power returns (#485).
 */
const applyCssVars = (host: HTMLElement, cssVars: ReadyCardState["cssVars"]): void => {
  for (const name of appliedCssVars.get(host) ?? []) {
    if (!(name in cssVars)) {
      host.style.removeProperty(name);
    }
  }
  for (const [name, value] of Object.entries(cssVars)) {
    host.style.setProperty(name, value);
  }
  appliedCssVars.set(host, Object.keys(cssVars));
};

/** Applies the parts of a card state that live outside the rendered template. */
export const applyCardState = (host: HTMLElement, state: ReadyCardState): void => {
  applyCssVars(host, state.cssVars);
  if (host.shadowRoot) {
    animateFlowDots(host.shadowRoot, resolveDotAnimation(state.dotAnimation));
  }
};
