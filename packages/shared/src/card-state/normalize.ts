import { computeNonFossilFromCollection } from "@flixlix-cards/shared/states/utils/energy-period";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import {
  type ComboEntity,
  type ConfigEntities,
  type IndividualDeviceType,
} from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { conditionsMet } from "./conditions";
import { adjustZeroTolerance } from "./tolerance";
import { type CardStateInput, type ReadyReadings, type TwoWayReading } from "./types";

type NormalizeInput = Pick<CardStateInput, "config" | "hass" | "conditionContext">;

/** What each node puts in or takes out, after signs, tolerance, outage and display_zero. */
export type NodeTotals = Readonly<{
  gridImport: number;
  gridExport: number;
  solar: number;
  batteryCharge: number;
  batteryDischarge: number;
  /** The home entity's reading, present only with `override_state`. */
  measuredHome?: number;
  individuals: ReadonlyArray<number>;
  /** Share of grid import from low-carbon sources, in [0, 1]; 0 while the node is hidden. */
  nonFossilFraction: number;
}>;

/** Which nodes are shown. */
export type Presence = Readonly<{
  grid: boolean;
  solar: boolean;
  battery: boolean;
  nonFossil: boolean;
  individuals: ReadonlyArray<boolean>;
  auxiliary: boolean;
}>;

export type Normalized = Readonly<{
  totals: NodeTotals;
  presence: Presence;
  outage: boolean;
  /** Per individual device: it reads negative with `accept_negative`, so it feeds the home. */
  feedingIndividuals: ReadonlyArray<boolean>;
  /**
   * The display-only auxiliary node, kept out of the totals the solver reads: 0 while hidden, and
   * feeding when it reads negative with `accept_negative`.
   */
  auxiliary: Readonly<{ total: number; feeding: boolean }>;
}>;

type Directions = Readonly<{ into: number; outOf: number }>;
type Direction = keyof Directions;

const magnitude = (value: number | null | undefined): number =>
  value !== null && value !== undefined && Number.isFinite(value) ? Math.abs(value) : 0;

const positivePart = (value: number | null): number =>
  value !== null && Number.isFinite(value) ? Math.max(value, 0) : 0;

const clampFraction = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

/**
 * A single entity reads positive in the node's primary direction and negative in the other;
 * `invert_state` swaps them.
 */
const directions = (reading: TwoWayReading, primary: Direction, invert: boolean): Directions => {
  if (reading.kind === "split") {
    return { into: positivePart(reading.into), outOf: positivePart(reading.outOf) };
  }
  const value = reading.value ?? 0;
  const signed = invert ? -value : value;
  const forward = positivePart(signed);
  const backward = positivePart(-signed);
  return primary === "into"
    ? { into: forward, outOf: backward }
    : { into: backward, outOf: forward };
};

const tolerated = (reading: Directions, tolerance: number | undefined): Directions => ({
  into: adjustZeroTolerance(reading.into, tolerance),
  outOf: adjustZeroTolerance(reading.outOf, tolerance),
});

const solarProduction = (input: NormalizeInput, readings: ReadyReadings): number => {
  const total = readings.solar.total ?? 0;
  return positivePart(input.config.entities.solar?.invert_state ? -total : total);
};

export const isOutage = (hass: HomeAssistant, entities: ConfigEntities): boolean => {
  const outage = entities.grid?.power_outage;
  const outageState = outage?.entity ? hass.states[outage.entity]?.state : undefined;
  return entities.grid !== undefined && outageState === (outage?.state_alert ?? "on");
};

/**
 * A node is configured only with an entity: a non-empty id, or split entities with one side set.
 * An empty one, as the visual editor leaves after clearing the field, does not count.
 */
export const hasEntity = (field: { entity?: string | ComboEntity } | undefined): boolean => {
  const entity = field?.entity;
  return typeof entity === "object" ? !!(entity.consumption || entity.production) : !!entity;
};

const shownWithTotals = (
  field: { display_zero?: boolean } | undefined,
  totals: Directions
): boolean => !(field?.display_zero === false && totals.into === 0 && totals.outOf === 0);

const nonFossilFraction = (input: NormalizeInput, readings: ReadyReadings, gridImport: number) => {
  if (readings.fossilEnergyConsumption) {
    const share = computeNonFossilFromCollection(readings.fossilEnergyConsumption, gridImport);
    return clampFraction(share.nonFossilPercentage / 100);
  }
  const entity = input.config.entities.fossil_fuel_percentage?.entity;
  const fossilPercentage = entity === undefined ? 0 : (getEntityState(input.hass, entity) ?? 0);
  return clampFraction(1 - fossilPercentage / 100);
};

type NodeReadings = Readonly<{
  toleratedGrid: Directions;
  battery: Directions;
  solar: number;
  toleratedSolar: number;
}>;

const nodeReadings = (input: NormalizeInput, readings: ReadyReadings): NodeReadings => {
  const { entities } = input.config;
  const grid = directions(readings.grid, "outOf", !!entities.grid?.invert_state);
  const batteryPrimary = readings.family === "power" ? "outOf" : "into";
  const battery = directions(readings.battery, batteryPrimary, !!entities.battery?.invert_state);
  const solar = solarProduction(input, readings);
  return {
    toleratedGrid: tolerated(grid, entities.grid?.display_zero_tolerance),
    battery: tolerated(battery, entities.battery?.display_zero_tolerance),
    solar,
    toleratedSolar: adjustZeroTolerance(solar, entities.solar?.display_zero_tolerance),
  };
};

type DeviceField = { display_zero_tolerance?: number; accept_negative?: boolean } | undefined;

const deviceTotal = (field: DeviceField, reading: number | null | undefined) =>
  adjustZeroTolerance(magnitude(reading), field?.display_zero_tolerance);

const isFeeding = (field: DeviceField, reading: number | null | undefined) =>
  field?.accept_negative === true && (reading ?? 0) < 0;

const deviceShown = (
  field: { entity?: string; display_zero?: boolean } | undefined,
  total: number
): boolean => !!field?.entity && (field.display_zero === true || total > 0);

const individualTotals = (input: NormalizeInput, readings: ReadyReadings) =>
  (input.config.entities.individual ?? []).map((field, index) =>
    deviceTotal(field, readings.individuals[index])
  );

const individualShown = (
  input: NormalizeInput,
  field: IndividualDeviceType | undefined,
  total: number
): boolean =>
  deviceShown(field, total) &&
  conditionsMet(field?.visibility ?? [], input.hass, input.conditionContext);

const feedingIndividuals = (input: NormalizeInput, readings: ReadyReadings) =>
  (input.config.entities.individual ?? []).map((field, index) =>
    isFeeding(field, readings.individuals[index])
  );

const presenceOf = (
  input: NormalizeInput,
  nodes: NodeReadings,
  individuals: ReadonlyArray<number>,
  auxiliary: number
): Omit<Presence, "nonFossil"> => {
  const { entities } = input.config;
  return {
    grid: hasEntity(entities.grid) && shownWithTotals(entities.grid, nodes.toleratedGrid),
    solar: hasEntity(entities.solar) && (entities.solar?.display_zero !== false || nodes.solar > 0),
    battery: hasEntity(entities.battery) && shownWithTotals(entities.battery, nodes.battery),
    individuals: individuals.map((total, index) =>
      individualShown(input, entities.individual?.[index], total)
    ),
    auxiliary: deviceShown(entities.auxiliary, auxiliary),
  };
};

const nonFossilShown = (
  input: NormalizeInput,
  gridShown: boolean,
  outage: boolean,
  nonFossilImport: number
): boolean => {
  const fossil = input.config.entities.fossil_fuel_percentage;
  if (!fossil?.entity || !gridShown || outage) {
    return false;
  }
  return fossil.display_zero === true || nonFossilImport > 0;
};

const gridDuringOutage = (input: NormalizeInput, readings: ReadyReadings): Directions => ({
  into: 0,
  outOf: adjustZeroTolerance(
    magnitude(readings.generator),
    input.config.entities.grid?.display_zero_tolerance
  ),
});

const measuredHome = (input: NormalizeInput, readings: ReadyReadings): number | undefined => {
  const home = input.config.entities.home;
  return home?.override_state && home.entity ? magnitude(readings.home) : undefined;
};

const shown = (isShown: boolean, value: number): number => (isShown ? value : 0);

/**
 * Turns entity readings into the totals the flows are solved from: splits signed readings by
 * direction, applies `invert_state` and each node's zero tolerance, replaces the grid by the
 * generator during an outage and zeroes the totals of hidden nodes.
 */
export const normalize = (input: NormalizeInput, readings: ReadyReadings): Normalized => {
  const nodes = nodeReadings(input, readings);
  const individuals = individualTotals(input, readings);
  const auxiliary = deviceTotal(input.config.entities.auxiliary, readings.auxiliary);
  const outage = isOutage(input.hass, input.config.entities);
  const fraction = nonFossilFraction(input, readings, nodes.toleratedGrid.outOf);
  const visible = presenceOf(input, nodes, individuals, auxiliary);
  const presence = {
    ...visible,
    nonFossil: nonFossilShown(input, visible.grid, outage, nodes.toleratedGrid.outOf * fraction),
  };
  const grid = outage ? gridDuringOutage(input, readings) : nodes.toleratedGrid;
  return {
    totals: {
      gridImport: shown(presence.grid, grid.outOf),
      gridExport: shown(presence.grid, grid.into),
      solar: shown(presence.solar, nodes.toleratedSolar),
      batteryCharge: shown(presence.battery, nodes.battery.into),
      batteryDischarge: shown(presence.battery, nodes.battery.outOf),
      measuredHome: measuredHome(input, readings),
      individuals: individuals.map((total, index) =>
        shown(presence.individuals[index] ?? false, total)
      ),
      nonFossilFraction: shown(presence.nonFossil, fraction),
    },
    presence,
    outage,
    feedingIndividuals: feedingIndividuals(input, readings),
    auxiliary: {
      total: shown(presence.auxiliary, auxiliary),
      feeding: isFeeding(input.config.entities.auxiliary, readings.auxiliary),
    },
  };
};
