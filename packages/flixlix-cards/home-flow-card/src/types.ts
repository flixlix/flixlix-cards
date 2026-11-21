import { type Condition } from "@flixlix-cards/shared/card-state";
import { type ConfigEntities, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";
import { expectedRange } from "./generic-options";

/** Red below 15 %, yellow below 30 %, green above. */
export const DEFAULT_STATE_OF_CHARGE_SEVERITY: ChargeSeverity = { red: 15, yellow: 30 };

/**
 * Where the battery's label shows its state of charge, relative to its value: under it beside the
 * direction (`below_value`), swapped with it as the large value (`above_value`), or on the same
 * line, `after_value` or `before_value`.
 */
export type StateOfChargePosition = "below_value" | "above_value" | "after_value" | "before_value";

/** The names `StateOfChargePosition` had before energy mode; still read as their `_value` twins. */
export type LegacyStateOfChargePosition =
  | "below_power"
  | "above_power"
  | "after_power"
  | "before_power";

export const STATE_OF_CHARGE_POSITIONS: readonly StateOfChargePosition[] = [
  "below_value",
  "above_value",
  "after_value",
  "before_value",
];

/** Power Flow Card Plus' battery, with where its charge bar changes colour. */
export type HouseBattery = NonNullable<ConfigEntities["battery"]> & {
  /**
   * Where the charge bar turns red and yellow, in %; it is green above both. Defaults to
   * `DEFAULT_STATE_OF_CHARGE_SEVERITY`.
   */
  state_of_charge_severity?: ChargeSeverity;
  /** Defaults to `below_value`. */
  state_of_charge_position?: StateOfChargePosition | LegacyStateOfChargePosition;
};

/**
 * A generator the inverter switches to during a grid outage. It is never drawn on the grid
 * cable: that would back-feed the grid.
 */
export type HouseGenerator = { entity: string; name?: string };

/** An electric car charging from the home's outlet, parked in front of the house. */
export type HouseCar = {
  /** Its charging power: positive while it charges, negative while it feeds the home. */
  entity: string;
  name?: string;
  /** Its battery's state of charge, in %. */
  state_of_charge?: string;
  /** Shown only while all of these hold, as in a card's visibility tab; always shown without. */
  visibility?: Condition[];
  /**
   * Parked and unplugged while all of these hold; without them, while it draws no power. Live
   * only: in energy mode it is idle while it used nothing over the period.
   */
  idle?: Condition[];
};

/**
 * What the heat pump's label shows under its power, read from its climate entity: what it is
 * doing (`state`), its current temperature, or its current and target temperature.
 */
export type HeatPumpStatus = "state" | "temperature" | "temperature_and_target";

export const HEAT_PUMP_STATUSES: readonly HeatPumpStatus[] = [
  "state",
  "temperature",
  "temperature_and_target",
];

/** A heat pump hung on the front wall, wired to the home's outlet. */
export type HouseHeatPump = {
  /** Its power, in W. */
  entity: string;
  name?: string;
  /** Opened on tap, and where its state and temperatures are read from. */
  climate?: string;
  /** Needs `climate`. Defaults to `state`. */
  status?: HeatPumpStatus;
};

/**
 * What the card's sensors measure: live power in W (`power`), or energy in Wh over the period
 * picked on the dashboard's energy date picker (`energy`).
 */
export type HomeFlowMode = "power" | "energy";

export const MODES: readonly HomeFlowMode[] = ["power", "energy"];

export const VIEWS = ["live", "today", "yesterday", "week", "month", "year"] as const;

export type HomeFlowView = (typeof VIEWS)[number];

export const DEFAULT_VIEWS: readonly HomeFlowView[] = ["live", "today"];

type NodeEntity = NonNullable<ConfigEntities["grid"]>["entity"];

export type HomeFlowEnergyEntities = {
  grid?: NodeEntity;
  solar?: string;
  battery?: NodeEntity;
  home?: string;
  generator?: string;
  car?: string;
  heat_pump?: string;
};

/** The card's nodes, configured as in Power Flow Card Plus' `entities`. */
export type HomeFlowNodes = {
  grid?: ConfigEntities["grid"];
  solar?: ConfigEntities["solar"];
  battery?: HouseBattery;
  home?: ConfigEntities["home"];
};

/** The range read from the card's expected values, as the shared pipeline names it. */
type ExpectedRange = "min_expected_power" | "max_expected_power";

/**
 * `T` without `entities` and the expected range; unlike `Omit`, keeps the named keys of a type
 * with an index signature.
 */
type CardKeys<T> = { [K in keyof T as K extends "entities" | ExpectedRange ? never : K]: T[K] };

type CardOptions = CardKeys<PowerFlowCardPlusConfig> & {
  /** Defaults to `power`. */
  mode?: HomeFlowMode;
  energy_entities?: HomeFlowEnergyEntities;
  views?: HomeFlowView[];
  /**
   * With `mode: energy`, the energy date picker to follow, as in Energy Flow Card Plus; without,
   * the dashboard's own.
   */
  collection_key?: string;
  /**
   * Where the wires' pulses are slowest, in the card's unit: W live, Wh in energy mode. Over a
   * period without an expected range, each wire's pulses share out what was supplied instead.
   * Defaults to 0.01.
   */
  min_expected_value?: number;
  /** Where the wires' pulses are fastest, in the card's unit. Defaults to 2000. */
  max_expected_value?: number;
  /** The older, live-only name of `min_expected_value`, in W. */
  min_expected_power?: number;
  /** The older, live-only name of `max_expected_value`, in W. */
  max_expected_power?: number;
  /** Roll the numbers to their new value when a reading changes. Defaults to true. */
  animate_numbers?: boolean;
  /**
   * How many times thicker than the default the wires are drawn. Like the labels' text, they
   * keep a similar size in px whatever the card's width. Defaults to 1.
   */
  wire_width?: number;
  /**
   * How large the values of a grid or battery that ran both ways are drawn, against the other
   * labels' values, as they hold two. Only energy mode has them. Defaults to 1.
   */
  two_way_value_size?: number;
  /**
   * Draws a generator wired to the inverter, carrying its power during a grid outage; needs the
   * grid's `power_outage` to know when there is one. In energy mode it is drawn beside the grid
   * whenever it ran over the period, without `power_outage`.
   */
  generator?: HouseGenerator;
  /** Draws a car in front of the house, wired to the home's outlet. */
  car?: HouseCar;
  /** Draws a heat pump on the front wall, wired to the home's outlet. */
  heat_pump?: HouseHeatPump;
};

/** The card's config: Power Flow Card Plus' options, with the nodes at the top level. */
export type HomeFlowCardConfig = CardOptions & HomeFlowNodes;

/** The same config in the `entities` shape the shared flow pipeline reads. */
export type FlowConfig = CardOptions &
  Pick<PowerFlowCardPlusConfig, ExpectedRange> & { entities: HomeFlowNodes };

const NODES = ["grid", "solar", "battery", "home"] as const;

/**
 * The grid as the shared pipeline reads it. Live, a generator runs only during an outage, so it
 * goes under `power_outage`. Over a period the grid may have been down for part of it, so its
 * live outage state says nothing about the totals: an energy card leaves `power_outage` out.
 */
const flowGrid = ({ grid, generator, mode }: HomeFlowCardConfig): HomeFlowNodes["grid"] => {
  if (mode === "energy" && grid) {
    const { power_outage: _liveOnly, ...periodGrid } = grid;
    return periodGrid;
  }
  return grid?.power_outage && generator
    ? { ...grid, power_outage: { ...grid.power_outage, entity_generator: generator.entity } }
    : grid;
};

/**
 * Moves the card's top-level nodes under `entities`, leaving out the ones not configured. The
 * shared pipeline reads a live generator as the grid's `power_outage.entity_generator`, and the
 * expected range as `min_expected_power` and `max_expected_power`.
 */
export const toFlowConfig = (config: HomeFlowCardConfig): FlowConfig => {
  const { grid: _grid, solar, battery, home, car, heat_pump: heatPump, ...options } = config;
  const nodes: HomeFlowNodes = { grid: flowGrid(config), solar, battery, home };
  const entities = Object.fromEntries(
    NODES.flatMap((node) => (nodes[node] === undefined ? [] : [[node, nodes[node]]]))
  );
  // a car or heat pump without its entity, e.g. one cleared in the editor, is not drawn at all
  return {
    ...options,
    ...expectedRange(config),
    ...(car?.entity ? { car } : {}),
    ...(heatPump?.entity ? { heat_pump: heatPump } : {}),
    entities,
  };
};

const overPeriod = (config: HomeFlowCardConfig, energy: HomeFlowEnergyEntities) => {
  const { energy_entities: _energy, views: _views, ...options } = config;
  const { grid, solar, battery, home, generator, car, heat_pump: heatPump } = energy;
  return toFlowConfig({
    ...options,
    mode: "energy",
    grid: grid === undefined ? undefined : { ...config.grid, entity: grid },
    solar: solar === undefined ? undefined : { ...config.solar, entity: solar },
    battery: battery === undefined ? undefined : { ...config.battery, entity: battery },
    home:
      home === undefined
        ? config.home && { ...config.home, override_state: false }
        : { ...config.home, entity: home },
    generator: generator === undefined ? undefined : { ...config.generator, entity: generator },
    car: car === undefined ? undefined : { ...config.car, entity: car },
    heat_pump: heatPump === undefined ? undefined : { ...config.heat_pump, entity: heatPump },
  });
};

export type HomeFlowViews = {
  live: FlowConfig;
  period: FlowConfig;
  views: readonly HomeFlowView[];
};

const isSet = (entity: NodeEntity | undefined) =>
  typeof entity === "string"
    ? entity !== ""
    : [entity?.consumption, entity?.production].some((id) => id !== undefined && id !== "");

const setEnergyEntities = (energy: HomeFlowEnergyEntities = {}): HomeFlowEnergyEntities | null => {
  const set = Object.fromEntries(Object.entries(energy).filter(([, entity]) => isSet(entity)));
  return Object.keys(set).length > 0 ? set : null;
};

const isView = (view: unknown): view is HomeFlowView => VIEWS.some((known) => known === view);

const selectorViews = (views: unknown[] | undefined): readonly HomeFlowView[] => {
  const picked = views ?? DEFAULT_VIEWS;
  if (picked.every(isView)) {
    return VIEWS.filter((view) => picked.includes(view));
  }
  throw new Error(`views takes any of ${VIEWS.join(", ")}`);
};

export const toFlowViews = (config: HomeFlowCardConfig): HomeFlowViews | null => {
  if (config.mode === "energy" && (config.energy_entities || config.views)) {
    throw new Error("energy_entities and views only work with mode: power");
  }
  const energy = setEnergyEntities(config.energy_entities);
  if (!energy) {
    return null;
  }
  const views = selectorViews(config.views);
  if (views.every((view) => view === "live")) {
    return null;
  }
  const { energy_entities: _energy, views: _views, ...live } = config;
  return {
    live: toFlowConfig({ ...live, mode: "power" }),
    period: overPeriod(config, energy),
    views,
  };
};

/** Lifts the nodes of an `entities`-shaped config, e.g. a suggested one, to the top level. */
export const fromEntities = (
  config: { entities?: ConfigEntities } & Record<string, unknown>
): Record<string, unknown> => {
  const { entities, ...options } = config;
  return {
    ...options,
    ...Object.fromEntries(
      NODES.flatMap((node) => (entities?.[node] === undefined ? [] : [[node, entities[node]]]))
    ),
  };
};
