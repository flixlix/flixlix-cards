import { unavailableOrMisconfiguredError } from "@flixlix-cards/shared/utils/unavailable-error";
import { type HomeAssistant } from "custom-card-helpers";
import { type HassEntity } from "home-assistant-js-websocket";
import { isEntityAvailable } from "./existence-entity";
import { getFirstEntityName } from "./mutli-entity";

export const getEntityStateObj = (
  hass: HomeAssistant,
  entity: string | undefined
): HassEntity | undefined => {
  if (!entity || !isEntityAvailable(hass, entity)) {
    unavailableOrMisconfiguredError(entity);
    return undefined;
  }

  return hass.states[getFirstEntityName(entity)];
};
