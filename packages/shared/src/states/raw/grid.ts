import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getFieldInState, getFieldOutState, getSecondaryState } from "./base";

export const getGridConsumptionState = (hass: HomeAssistant, config: PowerFlowCardPlusConfig) =>
  getFieldOutState(hass, config, "grid");

export const getGridProductionState = (hass: HomeAssistant, config: PowerFlowCardPlusConfig) =>
  getFieldInState(hass, config, "grid");

export const getGridSecondaryState = (hass: HomeAssistant, config: PowerFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "grid");
