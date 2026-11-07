import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { isNumberValue, nonEmpty, round } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, formatNumber } from "custom-card-helpers";
import { type UnitFamily } from "./types";

export type Formatter = (value: number | string | null, options?: FormatOptions) => string;

type FormatOptions = {
  unit?: string;
  unitWhiteSpace?: boolean;
  decimals?: number;
  accept_negative?: boolean;
};

/** Formats a value localized, rounded and scaled to k/M units of the reading's unit family. */
export const formatter =
  (hass: HomeAssistant, config: FlowCardPlusConfig, family: UnitFamily): Formatter =>
  (value, options = {}) =>
    displayValue(hass, config, family, value, options);

type Scale = {
  divisor: number;
  unit: string;
  decimals: number | undefined;
  fallbackDecimals: number;
};

/** The k/M scale a reading is shown in; an explicit unit always keeps the base scale. */
const scaleFor = (
  config: FlowCardPlusConfig,
  baseUnit: string,
  value: number,
  unit: string | undefined
): Scale => {
  const base = { divisor: 1, unit: baseUnit, decimals: config.base_decimals, fallbackDecimals: 0 };
  if (unit !== undefined) {
    return base;
  }
  if (value >= (config.mega_threshold ?? defaultValues.megaThreshold)) {
    return {
      divisor: 1000000,
      unit: `M${baseUnit}`,
      decimals: config.mega_decimals,
      fallbackDecimals: 2,
    };
  }
  if (value >= (config.kilo_threshold ?? defaultValues.kiloThreshold)) {
    return {
      divisor: 1000,
      unit: `k${baseUnit}`,
      decimals: config.kilo_decimals,
      fallbackDecimals: 2,
    };
  }
  return base;
};

const displayValue = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  family: UnitFamily,
  value: number | string | null,
  { unit, unitWhiteSpace, decimals, accept_negative }: FormatOptions
): string => {
  const whiteSpace = unitWhiteSpace === false ? "" : `\u2009`;
  const baseUnit = family === "energy" ? "Wh" : "W";

  if (value === null || value === undefined || value === "") {
    return `0${whiteSpace}${unit ?? baseUnit}`;
  }

  if (!isNumberValue(value)) {
    return value.toString();
  }

  const valueInNumber = Number(value);
  const scale = scaleFor(config, baseUnit, valueInNumber, unit);
  const rounded = round(
    valueInNumber / scale.divisor,
    decimals ?? scale.decimals ?? scale.fallbackDecimals
  );
  const v = formatNumber(accept_negative ? rounded : Math.abs(rounded), hass.locale);

  return `${v}${whiteSpace}${nonEmpty(unit) ?? scale.unit}`;
};
