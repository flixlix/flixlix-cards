import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type ComboEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type EntityReader, type ReadyReadings, type TwoWayReading } from "../types";
import { individualReading } from "./individual";

/** Live readings in W, null while the entity is unavailable or not numeric. */
export const wattsReader =
  (hass: HomeAssistant): EntityReader =>
  (entity) =>
    getEntityState(hass, entity) === null ? null : getEntityStateWatts(hass, entity);

const twoWay = (read: EntityReader, entity: string | ComboEntity | undefined): TwoWayReading => {
  if (typeof entity === "string") {
    return { kind: "single", value: read(entity) };
  }
  return {
    kind: "split",
    into: read(entity?.production),
    outOf: read(entity?.consumption),
  };
};

const solarReading = (hass: HomeAssistant, config: FlowCardPlusConfig, read: EntityReader) => {
  const solar = config.entities.solar;
  if (!solar?.entity) {
    return { total: null, secondary: 0 };
  }
  const secondaryEntity = solar.secondary_info?.entity;
  const secondary =
    solar.secondary_info?.sum_total && secondaryEntity
      ? Math.max(getEntityStateWatts(hass, secondaryEntity), 0)
      : 0;
  const production = read(solar.entity);
  return {
    total: production === null && !secondary ? null : (production ?? 0) + secondary,
    secondary,
  };
};

/** Live power readings in W from `hass.states`. */
export function powerReadings(hass: HomeAssistant, config: FlowCardPlusConfig): ReadyReadings {
  const { entities } = config;
  const read = wattsReader(hass);
  const generator = entities.grid?.power_outage?.entity_generator;
  return {
    status: "ready",
    family: "power",
    grid: twoWay(read, entities.grid?.entity),
    solar: solarReading(hass, config, read),
    battery: twoWay(read, entities.battery?.entity),
    home: entities.home?.override_state && entities.home.entity ? read(entities.home.entity) : null,
    generator: generator ? read(generator) : null,
    individuals: (entities.individual ?? []).map((individual) =>
      individualReading(individual, read)
    ),
    auxiliary: individualReading(entities.auxiliary, read),
  };
}
