import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { getEntityStateWatts } from "@/states/utils/get-entity-state-watts";
import { isEntityInverted } from "@/states/utils/is-entity-inverted";
import { onlyNegative, onlyPositive } from "@/states/utils/negative-positive";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";

export const getSolarState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) => {
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

export const getSolarSecondaryState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "solar");
