import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";

export const checkShouldShowDots = (config: EnergyFlowCardPlusConfig) => {
  if (config.disable_dots === true) {
    return false;
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  return true;
};
