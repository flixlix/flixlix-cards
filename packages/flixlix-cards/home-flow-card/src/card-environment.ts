import { energyStatisticIds } from "@flixlix-cards/shared/states/utils/statistic-ids";
import { type HomeAssistant } from "custom-card-helpers";
import { type FlowConfig } from "./types";

/** Home Assistant's `hass.themes.darkMode`, which custom-card-helpers' types leave out. */
export const isDarkMode = (hass: HomeAssistant): boolean => {
  const themes: unknown = hass.themes;
  return (
    typeof themes === "object" &&
    themes !== null &&
    "darkMode" in themes &&
    themes.darkMode === true
  );
};

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isPageHidden = () =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

export const isEnergy = (config: FlowConfig) => config.mode === "energy";

/** Every statistic an energy card reads, the fixtures only this card draws included. */
export const statisticIds = (config: FlowConfig) =>
  energyStatisticIds(config.entities, [
    config.generator?.entity,
    config.car?.entity,
    config.heat_pump?.entity,
  ]);
