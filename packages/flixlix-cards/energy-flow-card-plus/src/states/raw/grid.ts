import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { type HomeAssistant } from "custom-card-helpers";
import { getFieldInState, getFieldOutState, getSecondaryState } from "./base";

export const getGridConsumptionState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getFieldOutState(hass, config, "grid");

export const getGridProductionState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getFieldInState(hass, config, "grid");

export const getGridSecondaryState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "grid");
