import { type ConfigEntities } from "../types";

/**
 * Walk all sections of a card's `entities` config and return a deduplicated
 * array of entity IDs that the card's render output depends on.
 *
 * Handles the dual forms of `entity`:
 *   - string literal  →  "sensor.grid_power"
 *   - ComboEntity     →  { consumption: "sensor.grid_in", production: "sensor.grid_out" }
 *
 * Also collects `secondary_info.entity` and Grid `power_outage` entity refs.
 */
export function collectConfigEntityIds(entities: ConfigEntities): string[] {
  const ids = new Set<string>();

  const add = (id: string | undefined) => {
    if (id) ids.add(id);
  };

  const addEntityField = (
    entity: string | { consumption?: string; production?: string } | undefined
  ) => {
    if (!entity) return;
    if (typeof entity === "string") {
      add(entity);
    } else {
      add(entity.consumption);
      add(entity.production);
    }
  };

  // grid
  if (entities.grid) {
    addEntityField(entities.grid.entity);
    add(entities.grid.secondary_info?.entity);
    add(entities.grid.power_outage?.entity);
    add(entities.grid.power_outage?.entity_generator);
  }

  // solar
  if (entities.solar) {
    addEntityField(entities.solar.entity);
    add(entities.solar.secondary_info?.entity);
  }

  // battery
  if (entities.battery) {
    addEntityField(entities.battery.entity);
    add(entities.battery.state_of_charge);
    add(entities.battery.secondary_info?.entity);
  }

  // home
  if (entities.home) {
    addEntityField(entities.home.entity);
    add(entities.home.secondary_info?.entity);
  }

  // fossil_fuel_percentage
  if (entities.fossil_fuel_percentage) {
    addEntityField(entities.fossil_fuel_percentage.entity);
    add(entities.fossil_fuel_percentage.secondary_info?.entity);
  }

  // individual (array) — also handle legacy individual1/individual2 shapes
  const individualArrays = [entities.individual, entities.individual1, entities.individual2];

  for (const arr of individualArrays) {
    if (Array.isArray(arr)) {
      for (const device of arr) {
        addEntityField(device.entity);
        add(device.secondary_info?.entity);
      }
    }
  }

  return Array.from(ids);
}
