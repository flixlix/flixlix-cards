import { unavailableOrMisconfiguredError } from "@/utils/unavailable-error";
import { coerceNumber } from "@/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";
import { isEntityAvailable } from "./existence-entity";
import { getEntityNames } from "./mutli-entity";

export const getEntityState = (hass: HomeAssistant, entity: string | undefined): number | null => {
  if (!entity || !isEntityAvailable(hass, entity)) {
    unavailableOrMisconfiguredError(entity);
    return null;
  }

  const ids = getEntityNames(entity);

  let endResult: number = 0;
  let tempNumber: number;
  for (const id of ids) {
    const stateObj = hass.states[id];
    if (!stateObj) continue;
    tempNumber = coerceNumber(stateObj.state);
    endResult = endResult + tempNumber;
  }

  return endResult;
};
