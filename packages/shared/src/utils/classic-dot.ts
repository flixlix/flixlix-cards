/** A dot's way along its line, in the dot's own pixels, sampled at even steps of length. */
export type DotRoute = {
  points: { x: number; y: number; shown: boolean }[];
  radius: number;
  reverse: boolean;
};

/** How far through its loop a dot that began at `begin` is at `now`, from 0 to 1. */
export const loopProgress = (now: number, begin: number, duration: number): number => {
  const loops = (now - begin) / duration;
  return loops - Math.floor(loops);
};

/**
 * The SVG `<animateMotion>`, and the `<animate>` of its opacity where the line's box clips it,
 * that move a dot along its route in `duration` seconds from `begin` on its `<svg>`'s timeline.
 * The path runs in the direction of travel because older Chromium ignores `keyPoints` with
 * `calcMode="paced"` (the `no-paced-key-points` lint rule).
 */
export const classicDotAnimations = (
  route: DotRoute,
  duration: number,
  begin: number
): { motion: Record<string, string>; opacity?: Record<string, string> } => {
  const points = route.reverse
    ? route.points.map((point, index, all) => all[all.length - 1 - index] ?? point)
    : route.points;
  const timing = { dur: `${duration}s`, begin: `${begin}s`, repeatCount: "indefinite" };
  const motion = {
    path: points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" "),
    calcMode: "paced",
    ...timing,
  };
  if (points.every(({ shown }) => shown)) {
    return { motion };
  }
  return {
    motion,
    // The points are evenly spaced along the line, so they are evenly spaced in time too.
    opacity: {
      attributeName: "opacity",
      values: points.map(({ shown }) => (shown ? "1" : "0")).join(";"),
      keyTimes: points.map((_, index) => String(index / (points.length - 1))).join(";"),
      calcMode: "linear",
      ...timing,
    },
  };
};
