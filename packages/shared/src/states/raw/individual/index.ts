import { getEntityStateObj } from "@flixlix-cards/shared/states/utils/get-entity-state-obj";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { isNumberValue } from "@flixlix-cards/shared/utils/utils";
import { type IndividualDeviceType } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";

export const getIndividualState = (hass: HomeAssistant, field: IndividualDeviceType) => {
  const entity: string = field?.entity;

  if (entity === undefined) return null;

  const individualStateWatts = getEntityStateWatts(hass, entity);

  return Math.abs(individualStateWatts);
};

export const getIndividualSecondaryState = (hass: HomeAssistant, field: IndividualDeviceType) => {
  if (typeof field?.entity !== "string") return null;

  const entityObj = getEntityStateObj(hass, field?.secondary_info?.entity);
  const secondaryState = entityObj?.state;

  if (isNumberValue(secondaryState)) return Number(secondaryState);

  return secondaryState;
};
