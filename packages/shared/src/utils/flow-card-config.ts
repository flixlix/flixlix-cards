import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "./get-default-config";
import { coerceNumber } from "./utils";

type Entities = FlowCardPlusConfig["entities"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFilled = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

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

const hasSourceEntity = (entities: Entities | undefined): boolean =>
  !!entities && (!!entities.battery?.entity || !!entities.grid?.entity || !!entities.solar?.entity);

/**
 * Whether the card has no grid, solar or battery entity and shows only individual devices around
 * the home. An empty entity, as YAML or the editor can leave behind, does not count.
 */
export const isDeviceOnly = (entities: Entities | undefined): boolean =>
  ![entities?.battery, entities?.grid, entities?.solar].some(hasEntity);

const hasDeviceOnlyContent = (entities: Entities | undefined): boolean =>
  !!entities?.home?.entity || (entities?.individual ?? []).some((device) => !!device?.entity);

const NEEDS_SOURCE = "At least one entity for battery, grid or solar must be defined";
const NEEDS_SOURCE_OR_DEVICE =
  "At least one entity for battery, grid, solar, home or an individual device must be defined";

/** Throws for a config a flow card cannot render: legacy individual1/2 keys or nothing to show. */
export const assertRenderableFlowCardConfig = (
  config: FlowCardPlusConfig,
  { allowDeviceOnly = false }: { allowDeviceOnly?: boolean } = {}
): void => {
  const { entities } = config;
  if (entities?.individual1 || entities?.individual2) {
    throw new Error(
      "You are using an outdated configuration. Please update your configuration to the latest version. The individual1 and individual2 properties are now just a single individual array property. The easiest way to do this is to remove the individual1 and individual2 properties and replace them in the UI Editor."
    );
  }
  if (hasSourceEntity(entities) || (allowDeviceOnly && hasDeviceOnlyContent(entities))) {
    return;
  }
  throw new Error(allowDeviceOnly ? NEEDS_SOURCE_OR_DEVICE : NEEDS_SOURCE);
};

export const displayZeroLinesWithDefaults = (
  lines: FlowCardPlusConfig["display_zero_lines"]
): NonNullable<FlowCardPlusConfig["display_zero_lines"]> => ({
  mode: lines?.mode ?? defaultValues.displayZeroLines.mode,
  transparency: coerceNumber(lines?.transparency, defaultValues.displayZeroLines.transparency),
  grey_color: lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
  ...(lines?.grey_out_circles === undefined ? {} : { grey_out_circles: lines.grey_out_circles }),
});

/**
 * Nodes are clickable unless the config says `false`: most configs predate the option and leave
 * it out. Normalised once in `setConfig` so every reader can treat it as a plain boolean.
 */
export const clickableEntitiesWithDefault = (value: boolean | undefined): boolean =>
  value !== false;
