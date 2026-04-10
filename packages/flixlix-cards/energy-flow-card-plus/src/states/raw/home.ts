import { type PowerFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";

export const getHomeSecondaryState = (hass: HomeAssistant, config: PowerFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "home");
