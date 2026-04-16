import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant, formatNumber } from "custom-card-helpers";
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
    watt_threshold = 1000,
  }: {
    unit?: string;
    unitWhiteSpace?: boolean;
    decimals?: number;
    accept_negative?: boolean;
    watt_threshold?: number;
  }
): string => {
  const whiteSpace = unitWhiteSpace === false ? "" : " ";
  const isEnergyCard = (config?.type ?? "").includes("energy-flow-card-plus");
  const baseUnit = isEnergyCard ? "Wh" : "W";
  const kiloUnit = isEnergyCard ? "kWh" : "kW";

  if (value === null || value === undefined || value === "") {
    return `0${whiteSpace}${unit ?? baseUnit}`;
  }

  if (!isNumberValue(value)) return value.toString();

  const valueInNumber = Number(value);

  const isKilo = unit === undefined && valueInNumber >= watt_threshold;

  const decimalsToRound = decimals ?? (isKilo ? config.kw_decimals : config.w_decimals);

  const transformValue = (v: number) => (!accept_negative ? Math.abs(v) : v);

  const v = formatNumber(
    transformValue(
      isKilo
        ? round(valueInNumber / 1000, decimalsToRound ?? 2)
        : round(valueInNumber, decimalsToRound ?? 0)
    ),
    hass.locale
  );

  return `${v}${whiteSpace}${unit || (isKilo ? kiloUnit : baseUnit)}`;
};
