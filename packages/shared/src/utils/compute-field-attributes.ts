import { type ConfigEntity } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getEntityStateObj } from "../states/utils/get-entity-state-obj";
import { computeEntityName } from "./entity-name";

export const computeFieldIcon = (
  hass: HomeAssistant,
  field: ConfigEntity | undefined,
  fallback: string
): string => {
  if (field?.icon) return field.icon;

  if (field?.use_metadata) {
    if (typeof field?.entity === "string")
      return getEntityStateObj(hass, field?.entity)?.attributes?.icon || fallback;

    return (
      getEntityStateObj(hass, field?.entity?.consumption)?.attributes?.icon ||
      getEntityStateObj(hass, field?.entity?.production)?.attributes?.icon ||
      fallback
    );
  }

  return fallback;
};

const fieldStateObj = (hass: HomeAssistant, field: ConfigEntity | undefined) => {
  if (typeof field?.entity === "string") return getEntityStateObj(hass, field.entity);
  return (
    getEntityStateObj(hass, field?.entity?.consumption) ??
    getEntityStateObj(hass, field?.entity?.production)
  );
};

export const computeFieldName = (
  hass: HomeAssistant,
  field: ConfigEntity | undefined,
  fallback: string
): string => {
  if (field?.name) {
    return computeEntityName(hass, fieldStateObj(hass, field), field.name) || fallback;
  }

  if (field?.use_metadata) {
    return computeEntityName(hass, fieldStateObj(hass, field), undefined) || fallback;
  }

  return fallback;
};
