import { type BaseConfigEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { flowRate } from "./flows";
import { type ScaledReading, scaledReading } from "./format";
import { HOME_SOURCE_COLORS } from "./styles";
import { type ReadyCardState, type UnitFamily } from "./types";

export type HouseNode = "solar" | "battery" | "grid" | "generator" | "home" | "car" | "heat_pump";

/**
 * An electric car charging from the home, in W, or in Wh over the period on an energy card:
 * positive while it charges, negative while it feeds the home.
 */
export type CarReading = {
  power: number | null;
  unit_of_measurement?: string;
  decimals?: number;
};

/** A heat pump the home feeds, in W or Wh; it only ever draws power. */
export type HeatPumpReading = {
  power: number | null;
  unit_of_measurement?: string;
  decimals?: number;
};

/**
 * The wire between a node and the inverter the house card draws: every node is wired to the
 * inverter, so a wire carries the node's net power instead of one source → sink flow. Over an
 * energy period the grid and the battery may have run both ways: then each direction gets a wire
 * of its own, side by side in its `lane`.
 */
export type HouseWire = {
  node: HouseNode;
  /** Net power on the wire, ≥ 0; on an energy card, its direction's energy over the period in Wh. */
  power: number;
  /** Power runs from the node into the inverter: production, discharge, import. */
  intoInverter: boolean;
  /** Seconds per pulse, from the card's flow rate model. */
  durationSeconds: number;
  /**
   * Where the power sits in the card's expected range, in [0, 1]: 0 at `min_expected_power` or
   * below, 1 at `max_expected_power` or above. On an energy card, its share of the energy
   * supplied. Pulses grow longer with it.
   */
  intensity: number;
  /** CSS colour of the power on the wire; home takes the colour of its largest source. */
  color: string;
  reading: ScaledReading;
  /**
   * Which side of the node's route the wire runs on, seen from the node, while the node has a
   * wire for each direction: -1 for the direction into the inverter, 1 for the one out of it.
   */
  lane?: -1 | 1;
};

const SOLAR = "var(--energy-solar-color)";
const GRID_IN = "var(--energy-grid-consumption-color)";
const GRID_OUT = "var(--energy-grid-return-color)";
const BATTERY_OUT = "var(--energy-battery-out-color)";
const BATTERY_IN = "var(--energy-battery-in-color)";
const GENERATOR = "var(--energy-generator-color, #b07d4f)";

type Wire = Pick<HouseWire, "node" | "power" | "intoInverter" | "color" | "lane">;

/**
 * A two-way node's wire: what runs out of the node (`outOf`) and into it (`into`). Live power
 * runs one way at a time, so the wire carries their difference; energy over a period may have
 * run both ways, and then each direction gets its own lane.
 */
const twoWayWires = (
  family: UnitFamily,
  node: "grid" | "battery",
  { outOf, into }: { outOf: number | null; into: number | null },
  colors: { outOf: string; into: string }
): Wire[] => {
  const [fromNode, toNode] = [outOf ?? 0, into ?? 0];
  if (family === "energy" && fromNode > 0 && toNode > 0) {
    return [
      { node, power: fromNode, intoInverter: true, color: colors.outOf, lane: -1 },
      { node, power: toNode, intoInverter: false, color: colors.into, lane: 1 },
    ];
  }
  const intoInverter = fromNode >= toNode;
  return [
    {
      node,
      power: Math.abs(fromNode - toNode),
      intoInverter,
      color: intoInverter ? colors.outOf : colors.into,
    },
  ];
};

const solarWire = ({ nodes }: ReadyCardState): Wire | undefined =>
  nodes.solar.has
    ? { node: "solar", power: nodes.solar.state.total ?? 0, intoInverter: true, color: SOLAR }
    : undefined;

const batteryWires = ({ family, nodes }: ReadyCardState): Wire[] =>
  nodes.battery.has
    ? twoWayWires(
        family,
        "battery",
        { outOf: nodes.battery.state.fromBattery, into: nodes.battery.state.toBattery },
        { outOf: BATTERY_OUT, into: BATTERY_IN }
      )
    : [];

/** During an outage the grid cable is dead: what the grid's totals hold then is the generator's. */
const gridWires = ({ family, nodes }: ReadyCardState): Wire[] => {
  if (!nodes.grid.has) {
    return [];
  }
  if (nodes.grid.powerOutage.isOutage) {
    return [{ node: "grid", power: 0, intoInverter: true, color: GRID_IN }];
  }
  return twoWayWires(
    family,
    "grid",
    { outOf: nodes.grid.state.fromGrid, into: nodes.grid.state.toGrid },
    { outOf: GRID_IN, into: GRID_OUT }
  );
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

/** Like the car, the heat pump hangs off the home's outlet and takes the home's colour. */
const heatPumpWire = (
  state: ReadyCardState,
  heatPump: HeatPumpReading | undefined
): Wire | undefined =>
  heatPump && {
    node: "heat_pump",
    power: Math.max(heatPump.power ?? 0, 0),
    intoInverter: false,
    color: HOME_SOURCE_COLORS[state.homeRing.largestSource],
  };

const isWire = (wire: Wire | undefined): wire is Wire => wire !== undefined;

const clampedShare = (share: number) =>
  Number.isFinite(share) ? Math.min(Math.max(share, 0), 1) : 0;

/** The expected range is in W, so energy over a period is weighed against what was supplied. */
const intensity = (
  config: FlowCardPlusConfig,
  family: UnitFamily,
  power: number,
  supplied: number
): number => {
  if (family === "energy") {
    return supplied > 0 ? clampedShare(power / supplied) : 0;
  }
  const range = config.max_expected_power - config.min_expected_power;
  return range > 0 ? clampedShare((power - config.min_expected_power) / range) : 1;
};

/**
 * The wires of the nodes the card shows, in drawing order: solar, battery, grid, generator, home,
 * then the car and the heat pump when there are.
 */
export const houseWires = (
  config: FlowCardPlusConfig,
  state: ReadyCardState,
  car?: CarReading,
  heatPump?: HeatPumpReading
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
    heat_pump: heatPump,
  };
  const wires = [
    solarWire(state),
    ...batteryWires(state),
    ...gridWires(state),
    generatorWire(config, state),
    homeWire(state),
    carWire(state, car),
    heatPumpWire(state, heatPump),
  ].filter(isWire);
  const supplied = wires
    .filter((wire) => wire.intoInverter)
    .reduce((sum, wire) => sum + wire.power, 0);
  return wires.map(({ node, power, intoInverter, color, lane }) => ({
    node,
    power,
    intoInverter,
    color,
    lane,
    durationSeconds: flowRate(config, power, supplied),
    intensity: intensity(config, state.family, power, supplied),
    reading: scaledReading(config, state.family, power, {
      unit: entityOf[node]?.unit_of_measurement,
      decimals: entityOf[node]?.decimals,
      reading: true,
    }),
  }));
};
