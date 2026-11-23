import { lineDuration, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import {
  classicDotMotion,
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

/** Routes are rebuilt from float geometry on every update; any real layout change moves further. */
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
 * A dot's line, sampled in the line's SVG units, or nothing while it has no layout.
 *
 * Nothing on screen is measured. Through 0.6.x the route came from `getScreenCTM` of the dot and
 * the line, and from 0.6.0 of a dot while it moved, which put dots off their lines on some devices
 * whatever the animation method (#510).
 */
const dotLine = (root: ShadowRoot, dot: SVGSVGElement) => {
  const path = root.getElementById(dot.dataset.path ?? "");
  if (!(path instanceof SVGPathElement)) {
    return undefined;
  }
  const svg = path.ownerSVGElement;
  const toPixels = path.getCTM();
  const length = path.getTotalLength();
  if (!svg || !toPixels || !(length > 0) || svg.clientWidth === 0) {
    return undefined;
  }
  const pixelsPerUnit = Math.hypot(toPixels.a, toPixels.b);
  return {
    path,
    svg,
    toPixels,
    pixelsPerUnit,
    lengthPixels: length * pixelsPerUnit,
    points: Array.from({ length: SAMPLES + 1 }, (_, index) =>
      DOMPoint.fromPoint(path.getPointAtLength((length * index) / SAMPLES))
    ),
  };
};

type DotLine = NonNullable<ReturnType<typeof dotLine>>;

/**
 * A GPU dot's route in its own pixels. Its `<svg>` starts where its line's SVG does (`flowDot`),
 * so the path's matrix into that SVG (`getCTM`) is all it takes.
 */
const gpuRoute = (dot: SVGSVGElement, line: DotLine): Route => {
  // A line's SVG that clips hides the part of the path outside its box; the dot fades out there.
  const clips = getComputedStyle(line.svg).overflow !== "visible";
  const { clientWidth, clientHeight } = line.svg;
  return {
    points: line.points.map((point) => {
      const { x, y } = point.matrixTransform(line.toPixels);
      const shown = !clips || (x >= 0 && x <= clientWidth && y >= 0 && y <= clientHeight);
      return { x, y, shown };
    }),
    radius: Number(dot.dataset.radius) * line.pixelsPerUnit,
    reverse: dot.hasAttribute("data-reverse"),
  };
};

/** A classic dot's route in its line's SVG units, which it is drawn in. */
const classicRoute = (dot: SVGSVGElement, line: DotLine): Route => ({
  points: line.points.map(({ x, y }) => ({ x, y, shown: true })),
  radius: Number(dot.dataset.radius),
  reverse: dot.hasAttribute("data-reverse"),
});

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Each classic dot's `<circle>` in its line's SVG, with the route and timing it was built from, in
 * seconds of that SVG's timeline.
 */
const classicMotions = new WeakMap<
  SVGSVGElement,
  { circle: SVGCircleElement; route: Route; duration: number; begin: number }
>();

/** How far through its loop a classic dot is, from 0 to 1, removing its circle. */
const stopClassicDot = (dot: SVGSVGElement): number => {
  const running = classicMotions.get(dot);
  if (!running) {
    return 0;
  }
  classicMotions.delete(dot);
  const timeline = running.circle.ownerSVGElement;
  running.circle.remove();
  return timeline ? loopProgress(timeline.getCurrentTime(), running.begin, running.duration) : 0;
};

/**
 * Moves a dot as before 0.4.0: a `<circle>` with `<animateMotion>` inside its line's own SVG, in
 * that SVG's units and clipped by it, on the main thread with no GPU layers. The dot's own `<svg>`
 * stays empty.
 */
const moveClassicDot = (
  dot: SVGSVGElement,
  line: DotLine,
  route: Route,
  duration: number,
  progress: number
) => {
  const begin = line.svg.getCurrentTime() - progress * duration;
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("class", `classic-dot ${dot.firstElementChild?.getAttribute("class") ?? ""}`);
  circle.setAttribute("r", String(route.radius));
  circle.setAttribute("vector-effect", "non-scaling-stroke");
  circle.dataset.path = line.path.id;
  const motion = document.createElementNS(SVG_NS, "animateMotion");
  for (const [name, value] of Object.entries(classicDotMotion(route, duration, begin))) {
    motion.setAttribute(name, value);
  }
  circle.append(motion);
  line.svg.append(circle);
  classicMotions.set(dot, { circle, route, duration, begin });
};

/** Like a GPU dot, a classic dot carries on from the same place when its speed or route changes. */
const animateClassicDot = (dot: SVGSVGElement, line: DotLine, duration: number) => {
  const route = classicRoute(dot, line);
  const running = classicMotions.get(dot);
  if (
    running &&
    running.circle.parentNode === line.svg &&
    sameRoute(running.route, route) &&
    Math.abs(running.duration - duration) < 1e-6
  ) {
    return;
  }
  dot.firstElementChild?.removeAttribute("r");
  moveClassicDot(dot, line, route, duration, stopClassicDot(dot));
};

/** Moves a dot with Web Animations, which Chromium and WebKit run off the main thread. */
const animateGpuDot = (dot: SVGSVGElement, line: DotLine, duration: number) => {
  const route = gpuRoute(dot, line);
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
 * Browsers without Web Animations (before Chrome 84) get classic dots. A DOM without SVG geometry,
 * like the one unit tests render in, has no way to place them.
 */
const animateFlowDots = (root: ShadowRoot, animation: DotAnimation): void => {
  if (typeof SVGPathElement === "undefined") {
    return;
  }
  const mode = typeof Element.prototype.animate === "function" ? animation : "classic";
  const dots = [...root.querySelectorAll<SVGSVGElement>("svg.flow-dot")];
  for (const dot of dots) {
    const line = dotLine(root, dot);
    const seconds = line ? lineDuration(Number(dot.dataset.duration), line.lengthPixels) : 0;
    if (!line || !(seconds > 0)) {
      stopDot(dot);
      stopClassicDot(dot);
      continue;
    }
    if (mode === "classic") {
      stopDot(dot);
      animateClassicDot(dot, line, seconds);
    } else {
      stopClassicDot(dot);
      animateGpuDot(dot, line, seconds * 1000);
    }
  }
  // A classic circle lives in its line's SVG, which can outlast the dot it was drawn for.
  const drawn = new Set(dots.map((dot) => classicMotions.get(dot)?.circle));
  for (const circle of root.querySelectorAll<SVGCircleElement>("circle.classic-dot")) {
    if (!drawn.has(circle)) {
      circle.remove();
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
