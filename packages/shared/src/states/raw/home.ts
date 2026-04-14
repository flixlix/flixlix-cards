import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";

export const getHomeSecondaryState = (hass: HomeAssistant, config: PowerFlowCardPlusConfig) =>
  getSecondaryState(hass, config, "home");
