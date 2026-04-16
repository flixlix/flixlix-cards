import { isEntityAvailable } from "@flixlix-cards/shared/states/utils/existence-entity";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { unavailableOrMisconfiguredError } from "@flixlix-cards/shared/utils/unavailable-error";
import { type HomeAssistant } from "custom-card-helpers";

export const displayNonFossilState = (
  hass: HomeAssistant,
  config: PowerFlowCardPlusConfig,
  entityFossil: string,
  totalFromGrid: number
): string | number => {
  const cardType = config.type ?? "";
  const isEnergyCard = cardType.includes("energy-flow-card-plus");
  const unit = isEnergyCard ? "Wh" : "W";
  const kiloUnit = isEnergyCard ? "kWh" : "kW";
  if (!entityFossil || !isEntityAvailable(hass, entityFossil)) {
    unavailableOrMisconfiguredError(entityFossil);
    return "NaN";
  }
  const unitWhiteSpace = config.entities.fossil_fuel_percentage?.unit_white_space ?? true;
  const unitOfMeasurement: "W" | "Wh" | "%" =
    config.entities.fossil_fuel_percentage?.state_type === "percentage" ? "%" : unit;

  const nonFossilFuelDecimal: number = 1 - (getEntityState(hass, entityFossil) ?? 0) / 100;
  let gridConsumption: number;
  if (typeof config.entities.grid?.entity === "string") {
    gridConsumption = totalFromGrid;
  } else {
    gridConsumption = getEntityStateWatts(hass, config.entities.grid?.entity.consumption) || 0;
  }

  /* based on choice, change output from watts to % */

  const displayZeroTolerance = config.entities.fossil_fuel_percentage?.display_zero_tolerance ?? 0;
  if (unitOfMeasurement === unit) {
    let nonFossilFuelWatts = gridConsumption * nonFossilFuelDecimal;
    if (displayZeroTolerance) {
      if (nonFossilFuelWatts < displayZeroTolerance) {
        nonFossilFuelWatts = 0;
      }
    }
    return displayValue(hass, config, nonFossilFuelWatts, {
      unitWhiteSpace,
      watt_threshold: config.watt_threshold,
    });
  }
  let nonFossilFuelPercentage: number = 100 - (getEntityState(hass, entityFossil) ?? 0);
  if (displayZeroTolerance) {
    if (nonFossilFuelPercentage < displayZeroTolerance) {
      nonFossilFuelPercentage = 0;
    }
  }
  return displayValue(hass, config, nonFossilFuelPercentage, {
    unit: "%",
    unitWhiteSpace,
    decimals: 0,
    watt_threshold: config.watt_threshold,
  });
};
