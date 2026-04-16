import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const checkShouldShowDots = (config: FlowCardPlusConfig) => {
  if (config.disable_dots === true) {
    return false;
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  return true;
};
