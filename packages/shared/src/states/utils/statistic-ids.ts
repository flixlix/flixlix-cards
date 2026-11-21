import { type ComboEntity, type ConfigEntities } from "@flixlix-cards/shared/types";
import { getEntityNames } from "./mutli-entity";

const idsOf = (entity: string | ComboEntity | undefined): string[] => {
  if (entity === undefined) {
    return [];
  }
  const names = typeof entity === "string" ? [entity] : [entity.consumption, entity.production];
  return names.flatMap((name) => (name ? getEntityNames(name) : [])).filter(Boolean);
};

/**
 * Every statistic an energy card reads its period's growth from: each node's entities, the
 * secondary entities of its devices, and `extra` for what a card draws beyond the shared nodes.
 */
export const energyStatisticIds = (
  entities: ConfigEntities | undefined,
  extra: (string | undefined)[] = []
): string[] => {
  if (!entities) {
    return [];
  }
  const devices = [...(entities.individual ?? []), entities.auxiliary].flatMap((device) => [
    device?.entity,
    device?.secondary_info?.entity,
  ]);
  return [
    ...new Set([
      ...idsOf(entities.grid?.entity),
      ...idsOf(entities.battery?.entity),
      ...[
        entities.solar?.entity,
        entities.home?.entity,
        entities.fossil_fuel_percentage?.entity,
        ...devices,
        ...extra,
      ].flatMap(idsOf),
    ]),
  ];
};

/**
 * The grid's import statistics, which the low-carbon share is weighed by. An inverted single grid
 * entity counts export up, so it is no import meter to weigh.
 */
export const gridImportIds = (grid: ConfigEntities["grid"]): string[] => {
  if (typeof grid?.entity === "string") {
    return grid.invert_state ? [] : idsOf(grid.entity);
  }
  return idsOf(grid?.entity?.consumption);
};
