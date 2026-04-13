import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";

export const getHomeSecondaryState = (hass: HomeAssistant, config: EnergyFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "home");
