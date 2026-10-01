import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

/**
 * Lower bound for an animation duration, in seconds. Guards the reciprocal
 * arithmetic below against a config that sets a flow rate to 0.
 */
const MIN_DURATION = 0.01;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Maps a power/energy value onto an animation duration, in seconds.
 *
 * The interpolation happens in *speed* space (1 / duration) rather than in
 * duration space. Duration is what the SVG `animateMotion` consumes, but speed
 * is what the eye actually reads, and the two are reciprocals. Interpolating
 * the duration linearly therefore produces a hyperbolic speed response: with
 * the default 6s..0.75s range, a line running at 90% of `max_expected_power`
 * renders at only 59% of the top speed, and everything below roughly half power
 * collapses into an indistinguishable crawl.
 *
 * Interpolating the reciprocal keeps the same endpoints while making the
 * perceived dot speed track the value linearly.
 */
const newFlowRate = (config: FlowCardPlusConfig, value: number): number => {
  const maxPower = config.max_expected_power;
  const minPower = config.min_expected_power;
  const slowest = Math.max(config.max_flow_rate, MIN_DURATION);
  const fastest = Math.max(config.min_flow_rate, MIN_DURATION);

  // Values above max_expected_power clamp to the fastest speed, values below
  // min_expected_power to the slowest.
  const progress = clamp((value - minPower) / (maxPower - minPower), 0, 1);

  const slowestSpeed = 1 / slowest;
  const fastestSpeed = 1 / fastest;
  return 1 / (slowestSpeed + progress * (fastestSpeed - slowestSpeed));
};

const oldFlowRate = (config: FlowCardPlusConfig, value: number, total: number): number => {
  const min = config.min_flow_rate;
  const max = config.max_flow_rate;
  const denominator = total > 0 ? total : value > 0 ? value : 1;
  const ratio = value / denominator;
  return max - ratio * (max - min);
};

export const computeFlowRate = (
  config: FlowCardPlusConfig,
  value: number,
  total: number
): number => {
  const isNewFlowRateModel = config.use_new_flow_rate_model ?? true;
  const result = isNewFlowRateModel
    ? newFlowRate(config, value)
    : oldFlowRate(config, value, total);
  if (!Number.isFinite(result)) {
    return config.max_flow_rate;
  }
  return result;
};

export const computeIndividualFlowRate = (entry?: boolean | number, value?: number): number => {
  if (typeof entry === "number") {
    return entry;
  }
  if (entry !== false && value) {
    return value;
  }
  return 1.66;
};
