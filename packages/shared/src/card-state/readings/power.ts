import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type ComboEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type ReadyReadings, type TwoWayReading } from "../types";

/** Reading in W, or null while the entity is unavailable or not numeric. */
const watts = (hass: HomeAssistant, entity: string | undefined): number | null =>
  getEntityState(hass, entity) === null ? null : getEntityStateWatts(hass, entity);

const twoWay = (hass: HomeAssistant, entity: string | ComboEntity | undefined): TwoWayReading => {
  if (typeof entity === "string") {
    return { kind: "single", value: watts(hass, entity) };
  }
  return {
    kind: "split",
    into: watts(hass, entity?.production),
    outOf: watts(hass, entity?.consumption),
  };
};

const solarReading = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const solar = config.entities.solar;
  if (solar?.entity === undefined) {
    return { total: null, secondary: 0 };
  }
  const secondaryEntity = solar.secondary_info?.entity;
  const secondary =
    solar.secondary_info?.sum_total && secondaryEntity
      ? Math.max(getEntityStateWatts(hass, secondaryEntity), 0)
      : 0;
  const production = watts(hass, solar.entity);
  return {
    total: production === null && !secondary ? null : (production ?? 0) + secondary,
    secondary,
  };
};

/** Live power readings in W from `hass.states`; `deviceOnly` also reads the home entity. */
export function powerReadings(
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  deviceOnly = false
): ReadyReadings {
  const { entities } = config;
  const generator = entities.grid?.power_outage?.entity_generator;
  return {
    status: "ready",
    family: "power",
    grid: twoWay(hass, entities.grid?.entity),
    solar: solarReading(hass, config),
    battery: twoWay(hass, entities.battery?.entity),
    home:
      (entities.home?.override_state || deviceOnly) && entities.home?.entity
        ? watts(hass, entities.home.entity)
        : null,
    generator: generator ? watts(hass, generator) : null,
    individuals: (entities.individual ?? []).map((individual) =>
      individual?.entity ? watts(hass, individual.entity) : null
    ),
  };
}
