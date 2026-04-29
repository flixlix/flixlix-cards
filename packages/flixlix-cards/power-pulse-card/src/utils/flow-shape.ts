/**
 * Maps a power value (W) to a [0, 1] intensity using a sqrt curve. Linear
 * makes small flows almost stationary on the default 5–5000 W range, log
 * compresses the high end so 100 W and 2 kW feel identical on narrow
 * ranges. Sqrt is the middle ground.
 */
export function powerToIntensity(
  power: number,
  options: { min?: number; max?: number } = {}
): number {
  const { min = 5, max = 5000 } = options;
  if (power <= min) return 0;
  if (power >= max) return 1;
  return Math.sqrt((power - min) / (max - min));
}

/**
 * Speed in px/s. Driving the flow in px/s rather than seconds-per-cycle
 * keeps perceived speed stable when the gap between pills changes.
 */
export function intensityToSpeed(intensity: number): number {
  return 4 + intensity * 30;
}

export function intensityToGap(intensity: number): number {
  const idleGap = 60;
  const multiplier = 40;
  return idleGap - intensity * multiplier;
}
