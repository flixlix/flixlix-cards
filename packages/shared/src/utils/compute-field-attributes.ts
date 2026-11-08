import { type ConfigEntity } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getEntityStateObj } from "../states/utils/get-entity-state-obj";
import { computeEntityName } from "./entity-name";
import { nonEmpty } from "./utils";

/** An entity attribute for a node with `use_metadata`; a combo entity tries consumption first. */
const metadataAttribute = (
  hass: HomeAssistant,
  field: ConfigEntity,
  attribute: "icon"
): string | undefined => {
  const attributeOf = (entity: string | undefined) =>
    nonEmpty(getEntityStateObj(hass, entity)?.attributes?.[attribute]);
  if (typeof field.entity === "string") {
    return attributeOf(field.entity);
  }
  return attributeOf(field.entity?.consumption) ?? attributeOf(field.entity?.production);
};

export const computeFieldIcon = (
  hass: HomeAssistant,
  field: ConfigEntity | undefined,
  fallback: string
): string => {
  if (field?.icon) {
    return field.icon;
  }
  if (field?.use_metadata) {
    return metadataAttribute(hass, field, "icon") ?? fallback;
  }
  return fallback;
};

/** The field's entities; a combo entity lists consumption first. */
const fieldEntities = (field: ConfigEntity): (string | undefined)[] =>
  typeof field.entity === "string"
    ? [field.entity]
    : [field.entity?.consumption, field.entity?.production];

/** The first name one of the field's entities resolves `name` to, as a combo entity tries each. */
const fieldEntityName = (
  hass: HomeAssistant,
  field: ConfigEntity,
  name: ConfigEntity["name"]
): string | undefined => {
  for (const entity of fieldEntities(field)) {
    const stateObj = getEntityStateObj(hass, entity);
    const resolved = stateObj && nonEmpty(computeEntityName(hass, stateObj, name));
    if (resolved) {
      return resolved;
    }
  }
  return typeof name === "string" ? nonEmpty(name) : undefined;
};

export const computeFieldName = (
  hass: HomeAssistant,
  field: ConfigEntity | undefined,
  fallback: string
): string => {
  if (field?.name) {
    return fieldEntityName(hass, field, field.name) ?? fallback;
  }
  if (field?.use_metadata) {
    return fieldEntityName(hass, field, undefined) ?? fallback;
  }
  return fallback;
};
