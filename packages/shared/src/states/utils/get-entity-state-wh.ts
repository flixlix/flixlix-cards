import { type HomeAssistant } from "custom-card-helpers";
import { getEntityState } from "./get-entity-state";
import { getFirstEntityName } from "./mutli-entity";
import { powerUnitFactor } from "./unit-prefix";

export const getEntityStateWh = (hass: HomeAssistant, entity: string | undefined): number => {
  const state = getEntityState(hass, entity);
  if (!entity || state === null) {
    return 0;
  }
  const entityState = hass.states[getFirstEntityName(entity)];
  if (!entityState) {
    return 0;
  }

  const unit = entityState.attributes.unit_of_measurement ?? "";

  return state * (powerUnitFactor(unit) ?? 1);
};
