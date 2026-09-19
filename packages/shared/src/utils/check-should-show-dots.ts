import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const checkShouldShowDots = (config: FlowCardPlusConfig) => {
  if (config.disable_dots === true) {
    return false;
  }
  if (config.disable_dots !== false) {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  return true;
};
