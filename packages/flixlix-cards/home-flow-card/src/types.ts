import { type Condition } from "@flixlix-cards/shared/card-state";
import { type ConfigEntities, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";

/** Red below 15 %, yellow below 30 %, green above. */
export const DEFAULT_STATE_OF_CHARGE_SEVERITY: ChargeSeverity = { red: 15, yellow: 30 };

/** Power Flow Card Plus' battery, with where its charge bar changes colour. */
export type HouseBattery = NonNullable<ConfigEntities["battery"]> & {
  /**
   * Where the charge bar turns red and yellow, in %; it is green above both. Defaults to
   * `DEFAULT_STATE_OF_CHARGE_SEVERITY`.
   */
  state_of_charge_severity?: ChargeSeverity;
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
  /** Parked and unplugged while all of these hold; without them, while it draws no power. */
  idle?: Condition[];
};

/** The card's nodes, configured as in Power Flow Card Plus' `entities`. */
export type HomeFlowNodes = {
  grid?: ConfigEntities["grid"];
  solar?: ConfigEntities["solar"];
  battery?: HouseBattery;
  home?: ConfigEntities["home"];
};

/** `T` without `entities`; unlike `Omit`, keeps the named keys of a type with an index signature. */
type WithoutEntities<T> = { [K in keyof T as K extends "entities" ? never : K]: T[K] };

type CardOptions = WithoutEntities<PowerFlowCardPlusConfig> & {
  /** Roll the numbers to their new value when a reading changes. Defaults to true. */
  animate_numbers?: boolean;
  /**
   * Draws a generator wired to the inverter, carrying its power during a grid outage; needs the
   * grid's `power_outage` to know when there is one.
   */
  generator?: HouseGenerator;
  /** Draws a car in front of the house, wired to the home's outlet. */
  car?: HouseCar;
};

/** The card's config: Power Flow Card Plus' options, with the nodes at the top level. */
export type HomeFlowCardConfig = CardOptions & HomeFlowNodes;

/** The same config in the `entities` shape the shared flow pipeline reads. */
export type FlowConfig = CardOptions & { entities: HomeFlowNodes };

const NODES = ["grid", "solar", "battery", "home"] as const;

/**
 * Moves the card's top-level nodes under `entities`, leaving out the ones not configured. The
 * shared pipeline reads a generator as the grid's `power_outage.entity_generator`.
 */
export const toFlowConfig = (config: HomeFlowCardConfig): FlowConfig => {
  const { grid, solar, battery, home, ...options } = config;
  const nodes: HomeFlowNodes = {
    grid:
      grid?.power_outage && options.generator
        ? {
            ...grid,
            power_outage: { ...grid.power_outage, entity_generator: options.generator.entity },
          }
        : grid,
    solar,
    battery,
    home,
  };
  const entities = Object.fromEntries(
    NODES.flatMap((node) => (nodes[node] === undefined ? [] : [[node, nodes[node]]]))
  );
  return { ...options, entities };
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
