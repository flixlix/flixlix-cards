import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { isEnergyCard } from "@flixlix-cards/shared/utils/is-energy-card";
import { type HomeAssistant, formatNumber } from "custom-card-helpers";
import { defaultValues } from "./get-default-config";
import { isNumberValue, round } from "./utils";

/**
 *
 * @param hass The Home Assistant instance
 * @param config The Power Flow Card Plus configuration
 * @param value The value to display
 * @param options Different options to display the value
 * @returns value with unit, localized and rounded to the correct number of decimals
 */
export const displayValue = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  value: number | string | null,
  {
    unit,
    unitWhiteSpace,
    decimals,
    accept_negative,
  }: {
    unit?: string;
    unitWhiteSpace?: boolean;
    decimals?: number;
    accept_negative?: boolean;
  }
): string => {
  const whiteSpace = unitWhiteSpace === false ? "" : " ";
  const energyCard = isEnergyCard(config);
  const baseUnit = energyCard ? "Wh" : "W";
  const kiloUnit = energyCard ? "kWh" : "kW";
  const megaUnit = energyCard ? "MWh" : "MW";

  if (value === null || value === undefined || value === "") {
    return `0${whiteSpace}${unit ?? baseUnit}`;
  }

  if (!isNumberValue(value)) return value.toString();

  const valueInNumber = Number(value);

  const isKilo =
    unit === undefined && valueInNumber >= (config.kilo_threshold ?? defaultValues.kiloThreshold);
  const isMega =
    unit === undefined && valueInNumber >= (config.mega_threshold ?? defaultValues.megaThreshold);

  const decimalsToRound =
    (decimals ?? isMega)
      ? config.mega_decimals
      : isKilo
        ? config.kilo_decimals
        : config.base_decimals;

  const transformValue = (v: number) => (!accept_negative ? Math.abs(v) : v);

  const v = formatNumber(
    transformValue(
      isMega
        ? round(valueInNumber / 1000000, decimalsToRound ?? 2)
        : isKilo
          ? round(valueInNumber / 1000, decimalsToRound ?? 2)
          : round(valueInNumber, decimalsToRound ?? 0)
    ),
    hass.locale
  );

  return `${v}${whiteSpace}${unit || (isMega ? megaUnit : isKilo ? kiloUnit : baseUnit)}`;
};
