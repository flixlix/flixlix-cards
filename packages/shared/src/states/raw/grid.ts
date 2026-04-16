import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getFieldInState, getFieldOutState, getSecondaryState } from "./base";

export const getGridConsumptionState = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getFieldOutState(hass, config, "grid");

export const getGridProductionState = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getFieldInState(hass, config, "grid");

export const getGridSecondaryState = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getSecondaryState(hass, config, "grid");
