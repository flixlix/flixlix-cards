import { type HomeAssistant } from "custom-card-helpers";
import { getEntityState } from "./get-entity-state";
import { getFirstEntityName } from "./mutli-entity";

const prefixes = ["K", "M", "G", "T", "P", "E", "Z", "Y"];

export const getEntityStateWh = (hass: HomeAssistant, entity: string | undefined): number => {
  const state = getEntityState(hass, entity);
  if (!entity || state === null) return 0;
  const entityState = hass.states[getFirstEntityName(entity)];
  if (!entityState) return 0;

  const unit = entityState.attributes.unit_of_measurement ?? "";

  return convertUnitToWh(state, unit);
};

const convertUnitToWh = (value: number, unit: string): number => {
  const prefix = unit.toUpperCase().slice(0, 1);
  const prefixIndex = prefixes.indexOf(prefix);

  if (prefixIndex > -1) return value * Math.pow(1000, prefixIndex + 1);
  return value;
};
