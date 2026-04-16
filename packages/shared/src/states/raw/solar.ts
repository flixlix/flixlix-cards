import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { isEntityInverted } from "@flixlix-cards/shared/states/utils/is-entity-inverted";
import { onlyNegative, onlyPositive } from "@flixlix-cards/shared/states/utils/negative-positive";
import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";

export const getSolarState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const entity = config.entities.solar?.entity;
  const secondaryEntity = config.entities.solar?.secondary_info?.entity;

  if (entity === undefined) return null;

  const solarStateWatts = getEntityStateWatts(hass, entity);
  const secondarySolarStateWatts = secondaryEntity
    ? Math.max(getEntityStateWatts(hass, secondaryEntity), 0)
    : 0;

  const sumTotalConfig = config.entities.solar?.secondary_info?.sum_total;
  const totalSolarState = sumTotalConfig
    ? solarStateWatts + secondarySolarStateWatts
    : solarStateWatts;

  if (isEntityInverted(config, "solar")) return onlyNegative(totalSolarState);

  return onlyPositive(totalSolarState);
};

export const getSolarSecondaryState = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getSecondaryState(hass, config, "solar");
