import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import {
  type HomeFlowCardConfig,
  type LegacyStateOfChargePosition,
  type StateOfChargePosition,
} from "./types";

const POSITION_OF_LEGACY: Record<LegacyStateOfChargePosition, StateOfChargePosition> = {
  below_power: "below_value",
  above_power: "above_value",
  after_power: "after_value",
  before_power: "before_value",
};

const isLegacyPosition = (position: string): position is LegacyStateOfChargePosition =>
  position in POSITION_OF_LEGACY;

/** A `state_of_charge_position`, its names from before energy mode read as their `_value` twins. */
export const genericPosition = (
  position: StateOfChargePosition | LegacyStateOfChargePosition | undefined
): StateOfChargePosition | undefined =>
  position && isLegacyPosition(position) ? POSITION_OF_LEGACY[position] : position;

/**
 * `min_expected_value` and `max_expected_value`. Live, the `min_expected_power` and
 * `max_expected_power` they replace still count; those are in W, so energy mode ignores them.
 */
const expectedValues = (config: HomeFlowCardConfig) => {
  const live = config.mode !== "energy";
  return {
    min: config.min_expected_value ?? (live ? config.min_expected_power : undefined),
    max: config.max_expected_value ?? (live ? config.max_expected_power : undefined),
  };
};

/**
 * The expected range as the shared pipeline reads it, in the card's unit. Over a period without
 * one, each wire's pulses share out what was supplied instead.
 */
export const expectedRange = (config: HomeFlowCardConfig) => {
  const { min, max } = expectedValues(config);
  const sharedOut = config.mode === "energy" && min === undefined && max === undefined;
  return {
    min_expected_power: coerceNumber(min, defaultValues.minExpectedPower),
    max_expected_power: coerceNumber(max, defaultValues.maxExpectedPower),
    ...(sharedOut ? { flow_rate_model: "relative" as const } : {}),
  };
};

/**
 * The config with the names from before energy mode moved to the ones that read for both modes,
 * so the editor shows them and saves only the new ones.
 */
export const withGenericOptions = (config: HomeFlowCardConfig): HomeFlowCardConfig => {
  const live = config.mode !== "energy";
  const { min_expected_power: _min, max_expected_power: _max, ...withoutPower } = config;
  const { min, max } = expectedValues(config);
  const position = genericPosition(config.battery?.state_of_charge_position);
  return {
    ...(live ? withoutPower : config),
    ...(min === undefined ? {} : { min_expected_value: min }),
    ...(max === undefined ? {} : { max_expected_value: max }),
    ...(config.battery && position
      ? { battery: { ...config.battery, state_of_charge_position: position } }
      : {}),
  };
};
