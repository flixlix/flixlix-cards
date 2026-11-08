import { type BaseConfigEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { flowRate } from "./flows";
import { type ScaledReading, scaledReading } from "./format";
import { HOME_SOURCE_COLORS } from "./styles";
import { type ReadyCardState } from "./types";

export type HouseNode = "solar" | "battery" | "grid" | "generator" | "home" | "car";

/** An electric car charging from the home, in W: positive while it charges, negative while it feeds the home. */
export type CarReading = {
  power: number | null;
  unit_of_measurement?: string;
  decimals?: number;
};

/**
 * The wire between a node and the inverter the house card draws: every node is wired to the
 * inverter, so a wire carries the node's net power instead of one source → sink flow.
 */
export type HouseWire = {
  node: HouseNode;
  /** Net power on the wire, ≥ 0. */
  power: number;
  /** Power runs from the node into the inverter: production, discharge, import. */
  intoInverter: boolean;
  /** Seconds per pulse, from the card's flow rate model. */
  durationSeconds: number;
  /**
   * Where the power sits in the card's expected range, in [0, 1]: 0 at `min_expected_power` or
   * below, 1 at `max_expected_power` or above. Pulses grow longer with it.
   */
  intensity: number;
  /** CSS colour of the power on the wire; home takes the colour of its largest source. */
  color: string;
  reading: ScaledReading;
};

const SOLAR = "var(--energy-solar-color)";
const GRID_IN = "var(--energy-grid-consumption-color)";
const GRID_OUT = "var(--energy-grid-return-color)";
const BATTERY_OUT = "var(--energy-battery-out-color)";
const BATTERY_IN = "var(--energy-battery-in-color)";
const GENERATOR = "var(--energy-generator-color, #b07d4f)";

/** `outOf` − `into` as a direction and a magnitude. */
const net = (outOf: number | null, into: number | null) => {
  const difference = (outOf ?? 0) - (into ?? 0);
  return { power: Math.abs(difference), intoInverter: difference >= 0 };
};

type Wire = Pick<HouseWire, "node" | "power" | "intoInverter" | "color">;

const solarWire = ({ nodes }: ReadyCardState): Wire | undefined =>
  nodes.solar.has
    ? { node: "solar", power: nodes.solar.state.total ?? 0, intoInverter: true, color: SOLAR }
    : undefined;

const batteryWire = ({ nodes }: ReadyCardState): Wire | undefined => {
  if (!nodes.battery.has) {
    return undefined;
  }
  const { power, intoInverter } = net(
    nodes.battery.state.fromBattery,
    nodes.battery.state.toBattery
  );
  return { node: "battery", power, intoInverter, color: intoInverter ? BATTERY_OUT : BATTERY_IN };
};

/** During an outage the grid cable is dead: what the grid's totals hold then is the generator's. */
const gridWire = ({ nodes }: ReadyCardState): Wire | undefined => {
  if (!nodes.grid.has) {
    return undefined;
  }
  if (nodes.grid.powerOutage.isOutage) {
    return { node: "grid", power: 0, intoInverter: true, color: GRID_IN };
  }
  const { power, intoInverter } = net(nodes.grid.state.fromGrid, nodes.grid.state.toGrid);
  return { node: "grid", power, intoInverter, color: intoInverter ? GRID_IN : GRID_OUT };
};

/**
 * A generator wired to the inverter, never to the grid: drawn only during an outage, when it
 * carries the generator's power.
 */
const generatorWire = (config: FlowCardPlusConfig, { nodes }: ReadyCardState): Wire | undefined => {
  const { grid } = nodes;
  if (
    !grid.has ||
    !grid.powerOutage.isOutage ||
    !config.entities.grid?.power_outage?.entity_generator
  ) {
    return undefined;
  }
  return {
    node: "generator",
    power: grid.state.fromGrid ?? 0,
    intoInverter: true,
    color: GENERATOR,
  };
};

const homeWire = (state: ReadyCardState): Wire => ({
  node: "home",
  power: state.homeBalance.measured ?? state.homeBalance.balanced,
  intoInverter: false,
  color: HOME_SOURCE_COLORS[state.homeRing.largestSource],
});

/**
 * The car hangs off the home's outlet, not the inverter: power "into the inverter" runs from the
 * car back to the outlet. Its colour is the home's, since the home feeds it.
 */
const carWire = (state: ReadyCardState, car: CarReading | undefined): Wire | undefined =>
  car && {
    node: "car",
    power: Math.abs(car.power ?? 0),
    intoInverter: (car.power ?? 0) < 0,
    color: HOME_SOURCE_COLORS[state.homeRing.largestSource],
  };

const isWire = (wire: Wire | undefined): wire is Wire => wire !== undefined;

const intensity = (config: FlowCardPlusConfig, power: number): number => {
  const range = config.max_expected_power - config.min_expected_power;
  const share = range > 0 ? (power - config.min_expected_power) / range : 1;
  return Number.isFinite(share) ? Math.min(Math.max(share, 0), 1) : 0;
};

/**
 * The wires of the nodes the card shows, in drawing order: solar, battery, grid, generator, home
 * and the car, when there is one.
 */
export const houseWires = (
  config: FlowCardPlusConfig,
  state: ReadyCardState,
  car?: CarReading
): HouseWire[] => {
  const { entities } = config;
  const entityOf: Record<
    HouseNode,
    Pick<BaseConfigEntity, "unit_of_measurement" | "decimals"> | undefined
  > = {
    solar: entities.solar,
    battery: entities.battery,
    grid: entities.grid,
    generator: undefined,
    home: entities.home,
    car,
  };
  const wires = [
    solarWire(state),
    batteryWire(state),
    gridWire(state),
    generatorWire(config, state),
    homeWire(state),
    carWire(state, car),
  ].filter(isWire);
  const supplied = wires
    .filter((wire) => wire.intoInverter)
    .reduce((sum, wire) => sum + wire.power, 0);
  return wires.map(({ node, power, intoInverter, color }) => ({
    node,
    power,
    intoInverter,
    color,
    durationSeconds: flowRate(config, power, supplied),
    intensity: intensity(config, power),
    reading: scaledReading(config, "power", power, {
      unit: entityOf[node]?.unit_of_measurement,
      decimals: entityOf[node]?.decimals,
      reading: true,
    }),
  }));
};
