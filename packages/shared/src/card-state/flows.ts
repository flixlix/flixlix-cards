import {
  FLOW_RATE_MODELS,
  type FlowCardPlusConfig,
  type FlowRateModel,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { type Balance } from "./nodes";
import { type Flow, type Flows } from "./types";

/** Seconds per dot when a flow's rate is not calculated from its value. */
const FIXED_FLOW_DURATION = 1.66;

/** Floor for `min_flow_rate`/`max_flow_rate`, so a 0 still gives a finite dot speed. */
const SHORTEST_DURATION = 0.01;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isFlowRateModel = (value: unknown): value is FlowRateModel =>
  FLOW_RATE_MODELS.some((model) => model === value);

/**
 * `flow_rate_model` when it is a known model, else the older `use_new_flow_rate_model` alias:
 * `false` is the relative model, anything else the default duration model.
 */
export const flowRateModel = (config: Partial<FlowCardPlusConfig>): FlowRateModel => {
  if (isFlowRateModel(config.flow_rate_model)) {
    return config.flow_rate_model;
  }
  return config.use_new_flow_rate_model === false ? "relative" : "duration";
};

/**
 * Seconds per dot in the duration model: time per dot shrinks linearly from `max_flow_rate` at
 * `min_expected_power` to `min_flow_rate` at `max_expected_power` and stays there above it. Below
 * `min_expected_power` it keeps growing past `max_flow_rate`.
 */
const linearDuration = (config: FlowCardPlusConfig, value: number): number => {
  const { min_flow_rate: min, max_flow_rate: max } = config;
  const { min_expected_power: minIn, max_expected_power: maxIn } = config;
  if (value > maxIn) {
    return min;
  }
  return ((value - minIn) * (min - max)) / (maxIn - minIn) + max;
};

/**
 * Seconds per dot in the speed model. Dot speed (1 / duration), not duration, moves linearly
 * across the expected power range, so twice the power looks about twice as fast.
 */
const linearSpeedDuration = (config: FlowCardPlusConfig, value: number): number => {
  const slowest = 1 / Math.max(config.max_flow_rate, SHORTEST_DURATION);
  const fastest = 1 / Math.max(config.min_flow_rate, SHORTEST_DURATION);
  const progress = clamp(
    (value - config.min_expected_power) / (config.max_expected_power - config.min_expected_power),
    0,
    1
  );
  return 1 / (slowest + progress * (fastest - slowest));
};

/** Seconds per dot: faster for larger values, absolute or relative to `total`. */
const flowRate = (config: FlowCardPlusConfig, value: number, total: number): number => {
  const min = config.min_flow_rate;
  const max = config.max_flow_rate;
  const relative = () => {
    const denominator = total > 0 ? total : value > 0 ? value : 1;
    return max - (value / denominator) * (max - min);
  };
  const durations: Record<FlowRateModel, () => number> = {
    duration: () => linearDuration(config, value),
    speed: () => linearSpeedDuration(config, value),
    relative,
  };
  const result = durations[flowRateModel(config)]();
  return Number.isFinite(result) ? result : max;
};

/**
 * `calculate_flow_rate`: a number pins the dot to that many seconds, `false` animates at a fixed
 * pace, anything else uses the calculated rate.
 */
const configuredDuration = (calculateFlowRate: boolean | number | undefined, rate: number) => {
  if (typeof calculateFlowRate === "number") {
    return calculateFlowRate;
  }
  return calculateFlowRate !== false && rate ? rate : FIXED_FLOW_DURATION;
};

/** Lines with nothing flowing are hidden, greyed out or faded per `display_zero_lines`. */
const zeroLine = (config: FlowCardPlusConfig, value: number, visible: boolean) => {
  const mode = config.display_zero_lines?.mode;
  if (value > 0 || mode === undefined || mode === "show") {
    return { visible, lineClass: "" };
  }
  const fades =
    (mode === "transparency" || mode === "custom") &&
    (config.display_zero_lines?.transparency ?? 50) > 0;
  const greys = mode === "grey_out" || mode === "custom";
  return {
    visible: visible && mode !== "hide",
    lineClass: `${fades ? "transparency " : ""}${greys ? "grey" : ""}`,
  };
};

type LineOptions = { visible: boolean; duration?: number };

const line = (
  config: FlowCardPlusConfig,
  value: number,
  total: number,
  { visible, duration = flowRate(config, value, total) }: LineOptions
): Flow => ({ value, durationSeconds: duration, ...zeroLine(config, value, visible) });

export type FlowContext = {
  config: FlowCardPlusConfig;
  balance: Balance;
  individuals: IndividualObject[];
  hasReturnToGrid: boolean;
};

export const computeFlows = ({
  config,
  balance,
  individuals,
  hasReturnToGrid,
}: FlowContext): Flows => {
  const { presence: has, flows } = balance;
  const toHomeDrawn = !config.entities.home?.hide;
  const total = [
    flows.gridToHome,
    flows.solarToHome,
    flows.solarToGrid,
    flows.solarToBattery,
    flows.batteryToHome,
    flows.gridToBattery,
    flows.batteryToGrid,
  ].reduce((sum, value) => sum + value, 0);
  const totalIndividual = individuals.reduce(
    (sum, individual) => sum + (individual.has ? (individual.state ?? 0) : 0),
    0
  );
  const nonFossilPower = flows.nonFossilToHome;
  const fossil = config.entities.fossil_fuel_percentage;
  return {
    batteryGrid: batteryGridLine(config, balance, total),
    batteryToHome: line(config, flows.batteryToHome, total, {
      visible: has.battery && toHomeDrawn,
    }),
    gridToHome: gridToHomeLine(config, balance, total, toHomeDrawn),
    solarToBattery: line(config, flows.solarToBattery, total, {
      visible: has.battery && has.solar,
    }),
    solarToGrid: line(config, flows.solarToGrid, total, {
      visible: has.grid && hasReturnToGrid && has.solar,
    }),
    solarToHome: line(config, flows.solarToHome, total, { visible: has.solar && toHomeDrawn }),
    nonFossil: line(config, nonFossilPower, total, {
      visible: true,
      duration: configuredDuration(
        fossil?.calculate_flow_rate,
        flowRate(config, nonFossilPower, total)
      ),
    }),
    individual: individuals.map((individual) => {
      const value = individual.state ?? 0;
      return line(config, value, totalIndividual, {
        visible: toHomeDrawn,
        duration: configuredDuration(
          individual.field?.calculate_flow_rate,
          flowRate(config, value, totalIndividual)
        ),
      });
    }),
  };
};

/** The grid line is drawn while importing, but styled by what reaches home. */
const gridToHomeLine = (
  config: FlowCardPlusConfig,
  { totals, presence, flows }: Balance,
  total: number,
  toHomeDrawn: boolean
): Flow => {
  const drawn = zeroLine(config, totals.gridImport, presence.grid && toHomeDrawn);
  return {
    ...line(config, flows.gridToHome, total, { visible: true }),
    visible: drawn.visible,
  };
};

/** One line carries both directions between grid and battery. */
const batteryGridLine = (
  config: FlowCardPlusConfig,
  { presence, flows }: Balance,
  total: number
): Flow => {
  const value = Math.max(flows.gridToBattery, flows.batteryToGrid);
  const styledBy = flows.batteryToGrid === 0 ? flows.gridToBattery : flows.batteryToGrid;
  return {
    ...line(config, value, total, { visible: presence.grid && presence.battery }),
    lineClass: zeroLine(config, styledBy, true).lineClass,
  };
};
