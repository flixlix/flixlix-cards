import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { getEntityState } from "@/states/utils/get-entity-state";
import { type HomeAssistant } from "custom-card-helpers";
import { getFieldInState, getFieldOutState } from "./base";

export const getBatteryStateOfCharge = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) => {
  const entity = config.entities.battery?.state_of_charge;

  if (entity === undefined) return null;

  return getEntityState(hass, entity);
};

export const getBatteryInState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getFieldInState(hass, config, "battery");

export const getBatteryOutState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getFieldOutState(hass, config, "battery");
