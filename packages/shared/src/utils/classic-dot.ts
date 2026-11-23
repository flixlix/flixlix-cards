/** A dot's way along its line, sampled at even steps of length. */
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
 * The SVG `<animateMotion>` that moves a dot along its route, in its line's SVG units, in
 * `duration` seconds from `begin` on that SVG's timeline. The path runs in the direction of travel
 * because older Chromium ignores `keyPoints` with `calcMode="paced"` (the `no-paced-key-points`
 * lint rule).
 */
export const classicDotMotion = (
  route: DotRoute,
  duration: number,
  begin: number
): Record<string, string> => {
  // Not `toReversed`: classic dots are for the older browsers that lack it.
  const points = route.reverse
    ? route.points.map((point, index, all) => all[all.length - 1 - index] ?? point)
    : route.points;
  return {
    path: points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" "),
    calcMode: "paced",
    dur: `${duration}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite",
  };
};
