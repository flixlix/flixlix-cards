import { lineDuration, type ReadyCardState } from "@flixlix-cards/shared/card-state";

/** Points sampled along a line; the dot moves straight between them. */
const SAMPLES = 40;

/** Each dot's running motion. `getAnimations()` is missing before Chrome 84. */
const motions = new WeakMap<SVGSVGElement, { animation: Animation; duration: number }>();

/** How far through its loop a dot is, from 0 to 1, stopping its current motion. */
const stopDot = (dot: SVGSVGElement): number => {
  const running = motions.get(dot);
  if (!running) {
    return 0;
  }
  const time = Number(running.animation.currentTime ?? 0);
  running.animation.cancel();
  motions.delete(dot);
  return (time % running.duration) / running.duration;
};

/** The dot's motion along its path, in the dot's own pixels, or nothing while it has no layout. */
const dotMotion = (root: ShadowRoot, dot: SVGSVGElement) => {
  const path = root.getElementById(dot.dataset.path ?? "");
  if (!(path instanceof SVGPathElement)) {
    return undefined;
  }
  const toDot = dot.getScreenCTM()?.inverse();
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
  const keyframes = Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const point = path.getPointAtLength((length * index) / SAMPLES);
    const onScreen = point.matrixTransform(fromPath);
    const { x, y } = point.matrixTransform(toPixels);
    const shown =
      !box ||
      (onScreen.x >= box.left &&
        onScreen.x <= box.right &&
        onScreen.y >= box.top &&
        onScreen.y <= box.bottom);
    return { transform: `translate(${x}px, ${y}px)`, opacity: shown ? 1 : 0 };
  });
  const pixelsPerUnit = Math.hypot(toPixels.a, toPixels.b);
  return {
    keyframes,
    radius: Number(dot.dataset.radius) * pixelsPerUnit,
    lengthPixels: length * pixelsPerUnit,
  };
};

/**
 * Moves every flow dot along its line at an even pace. `data-duration` is seconds per reference
 * line, stretched to the line's length so equal flow rates look equally fast on every line. A dot
 * keeps its place on the line when its speed changes, instead of jumping. All dots are stopped and
 * measured before any moves again.
 */
const animateFlowDots = (root: ShadowRoot): void => {
  if (typeof Element.prototype.animate !== "function") {
    return;
  }
  const dots = [...root.querySelectorAll<SVGSVGElement>("svg.flow-dot")];
  const progress = dots.map(stopDot);
  const paths = dots.map((dot) => dotMotion(root, dot));
  dots.forEach((dot, index) => {
    const motion = paths[index];
    if (!motion) {
      return;
    }
    const duration = lineDuration(Number(dot.dataset.duration), motion.lengthPixels) * 1000;
    if (!(duration > 0)) {
      return;
    }
    dot.firstElementChild?.setAttribute("r", String(motion.radius));
    const animation = dot.animate(motion.keyframes, {
      duration,
      iterations: Infinity,
      direction: dot.hasAttribute("data-reverse") ? "reverse" : "normal",
    });
    animation.currentTime = (progress[index] ?? 0) * duration;
    motions.set(dot, { animation, duration });
  });
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
