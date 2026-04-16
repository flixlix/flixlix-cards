import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getSecondaryState } from "./base";
import { getGridConsumptionState } from "./grid";

export const getNonFossilHas = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const nonFossil = config.entities.fossil_fuel_percentage;
  const fossilPercentageEntity = nonFossil?.entity;
  const fossilPercentageDisplayZero = nonFossil?.display_zero;
  const gridFromGrid = getGridConsumptionState(hass, config);

  if (fossilPercentageEntity === undefined) return false;

  if (fossilPercentageDisplayZero === true) return true;

  if (gridFromGrid === null) return false;

  return gridFromGrid * 1 - (getEntityState(hass, fossilPercentageEntity) ?? 0) / 100 > 0;
};

export const getNonFossilHasPercentage = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const nonFossil = config.entities.fossil_fuel_percentage;
  const fossilPercentageEntity = nonFossil?.entity;
  const fossilPercentageDisplayZero = nonFossil?.display_zero;
  const gridFromGrid = getGridConsumptionState(hass, config);

  if (fossilPercentageEntity === undefined) return false;

  if (fossilPercentageDisplayZero === true) return true;

  if (gridFromGrid === null) return false;

  if (getNonFossilHas(hass, config) === false) return false;

  return gridFromGrid * 1 - (getEntityState(hass, fossilPercentageEntity) ?? 0) / 100 > 0;
};

export const getNonFossilSecondaryState = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getSecondaryState(hass, config, "fossil_fuel_percentage");

export const getNonFossilState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const nonFossil = config.entities.fossil_fuel_percentage;
  const fossilPercentageEntity = nonFossil?.entity;
  const gridFromGrid = getGridConsumptionState(hass, config);

  if (fossilPercentageEntity === undefined) return null;

  if (gridFromGrid === null) return null;

  if (getNonFossilHas(hass, config) === false) return 0;

  return gridFromGrid * 1 - (getEntityState(hass, fossilPercentageEntity) ?? 0) / 100;
};
