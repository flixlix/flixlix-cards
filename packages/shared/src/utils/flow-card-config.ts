import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "./get-default-config";
import { coerceNumber } from "./utils";

type Entities = FlowCardPlusConfig["entities"];

const hasBatteryEntity = (battery: Entities["battery"]): boolean => {
  const entity = battery?.entity;
  return typeof entity === "object" ? !!(entity.consumption || entity.production) : !!entity;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFilled = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

/** Whether a node has anything selected in its `entity`, however the pickers left it. */
export const hasEntity = (node: { entity?: unknown } | undefined): boolean => {
  const entity = node?.entity;
  return isRecord(entity) ? Object.values(entity).some(isFilled) : isFilled(entity);
};

/**
 * Drops a node's `entity` when nothing is selected in it: an empty string, or a consumption /
 * production pair with neither filled in. Clearing an entity picker leaves these behind, and a
 * node whose entity is `{}` would otherwise still count as configured. Other settings are kept.
 */
export const dropEmptyEntity = (node: Record<string, unknown>): Record<string, unknown> => {
  const { entity, ...rest } = node;
  if (entity === undefined) {
    return node;
  }
  if (isRecord(entity)) {
    const filled = Object.fromEntries(Object.entries(entity).filter(([, part]) => isFilled(part)));
    return Object.keys(filled).length > 0 ? { ...rest, entity: filled } : rest;
  }
  return isFilled(entity) ? node : rest;
};

const ENTITY_NODES = ["grid", "solar", "battery", "fossil_fuel_percentage", "home"] as const;

/** The config with every node's empty `entity` removed, so "not selected" reads the same everywhere. */
export const withoutEmptyEntities = (config: FlowCardPlusConfig): FlowCardPlusConfig => {
  const { entities } = config;
  if (!entities) {
    return config;
  }
  const cleaned = Object.fromEntries(
    ENTITY_NODES.flatMap((name) => {
      const node = entities[name];
      return isRecord(node) ? [[name, dropEmptyEntity(node)]] : [];
    })
  );
  return { ...config, entities: { ...entities, ...cleaned } };
};

/** Whether the config has a grid, solar or battery entity: a node the home is supplied from. */
export const hasSourceEntity = (entities: Entities | undefined): boolean =>
  !!entities &&
  (hasBatteryEntity(entities.battery) || !!entities.grid?.entity || !!entities.solar?.entity);

/**
 * Whether the card shows only individual devices around the home: no grid, solar or battery.
 * The home then has no sources to be balanced from, so its consumption is read from the home
 * entity, or summed from the devices.
 */
export const isDeviceOnly = (entities: Entities | undefined): boolean => !hasSourceEntity(entities);

type AssertOptions = {
  /**
   * Accept a config without grid, solar or battery, as long as it has a home entity or at least
   * one individual device. Only the power flow card renders such a config.
   */
  allowDeviceOnly?: boolean;
};

const hasDeviceOnlyContent = (entities: Entities): boolean =>
  !!entities.home?.entity || (entities.individual ?? []).some((device) => !!device?.entity);

/** Throws for a config a flow card cannot render: legacy individual1/2 keys or nothing to show. */
export const assertRenderableFlowCardConfig = (
  config: FlowCardPlusConfig,
  { allowDeviceOnly = false }: AssertOptions = {}
): void => {
  const { entities } = config;
  if (entities?.individual1 || entities?.individual2) {
    throw new Error(
      "You are using an outdated configuration. Please update your configuration to the latest version. The individual1 and individual2 properties are now just a single individual array property. The easiest way to do this is to remove the individual1 and individual2 properties and replace them in the UI Editor."
    );
  }
  if (!entities) {
    throw new Error("At least one entity for battery, grid or solar must be defined");
  }
  if (hasSourceEntity(entities)) {
    return;
  }
  if (allowDeviceOnly && hasDeviceOnlyContent(entities)) {
    return;
  }
  throw new Error(
    allowDeviceOnly
      ? "At least one entity for battery, grid, solar, home or an individual device must be defined"
      : "At least one entity for battery, grid or solar must be defined"
  );
};

export const displayZeroLinesWithDefaults = (
  lines: FlowCardPlusConfig["display_zero_lines"]
): NonNullable<FlowCardPlusConfig["display_zero_lines"]> => ({
  mode: lines?.mode ?? defaultValues.displayZeroLines.mode,
  transparency: coerceNumber(lines?.transparency, defaultValues.displayZeroLines.transparency),
  grey_color: lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
});
