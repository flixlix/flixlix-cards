import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { isEntityInverted } from "@flixlix-cards/shared/states/utils/is-entity-inverted";
import { getFirstEntityName } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { onlyNegative, onlyPositive } from "@flixlix-cards/shared/states/utils/negative-positive";
import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { isNumberValue } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";

type BaseEntityField = Exclude<keyof FlowCardPlusConfig["entities"], "individual">;

export const getSecondaryState = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  field: BaseEntityField
) => {
  const entity = config.entities?.[field]?.secondary_info?.entity;

  if (typeof entity !== "string") return null;

  const entityObj = hass.states[getFirstEntityName(entity)];
  if (!entityObj) return null;
  const secondaryState = entityObj.state;

  if (isNumberValue(secondaryState)) return Number(secondaryState);

  return secondaryState;
};

export const getFieldInState = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  field: BaseEntityField
) => {
  const entity = config.entities[field]?.entity;

  if (entity === undefined) return null;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);

    if (isEntityInverted(config, field)) return onlyPositive(state);

    return onlyNegative(state);
  }
  return getEntityStateWatts(hass, entity!.production);
};

export const getFieldOutState = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  field: BaseEntityField
) => {
  const entity = config.entities[field]?.entity;

  if (entity === undefined) return null;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);

    if (isEntityInverted(config, field)) return onlyNegative(state);

    return onlyPositive(state);
  }
  return getEntityStateWatts(hass, entity!.consumption);
};
