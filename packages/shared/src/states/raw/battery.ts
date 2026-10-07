import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { onlyNegative, onlyPositive } from "@flixlix-cards/shared/states/utils/negative-positive";
import { type Battery, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import {
  getPrimaryBattery,
  normalizeBatteries,
} from "@flixlix-cards/shared/utils/normalize-batteries";
import { type HomeAssistant } from "custom-card-helpers";

export const getBatteryConfigInState = (hass: HomeAssistant, battery: Battery): number => {
  const entity = battery.entity;
  if (entity === undefined) return 0;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);
    if (battery.invert_state) return onlyPositive(state);
    return onlyNegative(state);
  }

  return getEntityStateWatts(hass, entity.production);
};

export const getBatteryConfigOutState = (hass: HomeAssistant, battery: Battery): number => {
  const entity = battery.entity;
  if (entity === undefined) return 0;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);
    if (battery.invert_state) return onlyNegative(state);
    return onlyPositive(state);
  }

  return getEntityStateWatts(hass, entity.consumption);
};

export const getBatteryConfigStateOfCharge = (
  hass: HomeAssistant,
  battery: Battery
): number | null => {
  const entity = battery.state_of_charge;
  if (entity === undefined) return null;
  return getEntityState(hass, entity);
};

export const getBatteryStateOfCharge = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const batteries = normalizeBatteries(config.entities.battery);
  if (batteries.length === 0) return null;
  const firstBattery = batteries[0];
  if (batteries.length === 1 && firstBattery) {
    return getBatteryConfigStateOfCharge(hass, firstBattery);
  }

  let weightedSum = 0;
  let totalCapacity = 0;
  let plainSum = 0;
  let plainCount = 0;

  for (const battery of batteries) {
    const soc = getBatteryConfigStateOfCharge(hass, battery);
    if (soc === null) continue;
    plainSum += soc;
    plainCount += 1;
    if (typeof battery.capacity === "number" && battery.capacity > 0) {
      weightedSum += soc * battery.capacity;
      totalCapacity += battery.capacity;
    }
  }

  if (totalCapacity > 0) return weightedSum / totalCapacity;
  if (plainCount === 0) return null;
  return plainSum / plainCount;
};

export const getBatteryInState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const batteries = normalizeBatteries(config.entities.battery);
  if (batteries.length === 0) return null;
  return batteries.reduce((sum, battery) => sum + getBatteryConfigInState(hass, battery), 0);
};

export const getBatteryOutState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const batteries = normalizeBatteries(config.entities.battery);
  if (batteries.length === 0) return null;
  return batteries.reduce((sum, battery) => sum + getBatteryConfigOutState(hass, battery), 0);
};

export const getBatteryDisplayZeroTolerance = (config: FlowCardPlusConfig): number | undefined => {
  const primary = getPrimaryBattery(config.entities.battery);
  return primary?.display_zero_tolerance;
};

export const getBatteryDisplayZero = (config: FlowCardPlusConfig): boolean | undefined => {
  const primary = getPrimaryBattery(config.entities.battery);
  return primary?.display_zero;
};
