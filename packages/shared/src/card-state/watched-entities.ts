import { getEntityNames } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { type ComboEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

type EntityField = {
  entity?: string | ComboEntity;
  secondary_info?: { entity?: string };
  state_of_charge?: string;
  power_outage?: { entity?: string; entity_generator?: string };
};

const fieldEntities = (field: EntityField | undefined): (string | undefined)[] => {
  const entity = field?.entity;
  return [
    ...(typeof entity === "object" ? [entity.consumption, entity.production] : [entity]),
    field?.secondary_info?.entity,
    field?.state_of_charge,
    field?.power_outage?.entity,
    field?.power_outage?.entity_generator,
  ];
};

/** Every entity id a flow card reads from `hass.states`; a change to any other entity cannot change the card. */
export function watchedEntities(config: FlowCardPlusConfig): string[] {
  const { battery, grid, solar, home, fossil_fuel_percentage, individual, auxiliary } =
    config.entities;
  const fields: (EntityField | undefined)[] = [
    battery,
    grid,
    solar,
    home,
    fossil_fuel_percentage,
    ...(individual ?? []),
    auxiliary,
  ];
  const ids = fields
    .flatMap(fieldEntities)
    .flatMap((entity) => (entity ? getEntityNames(entity) : []))
    .filter((id) => id !== "");
  return [...new Set(ids)];
}
