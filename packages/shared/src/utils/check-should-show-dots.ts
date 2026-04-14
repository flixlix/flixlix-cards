import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const checkShouldShowDots = (config: PowerFlowCardPlusConfig) => {
  if (config.disable_dots === true) {
    return false;
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  return true;
};
