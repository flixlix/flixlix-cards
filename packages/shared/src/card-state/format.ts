import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { isNumberValue, nonEmpty, round } from "@flixlix-cards/shared/utils/utils";
import { formatNumber, fractionDigitsFor } from "@flixlix-cards/shared/utils/format-number";
import { powerUnitFactor } from "@flixlix-cards/shared/states/utils/unit-prefix";
import { type HomeAssistant } from "custom-card-helpers";
import { type UnitFamily } from "./types";

export type Formatter = (value: number | string | null, options?: FormatOptions) => string;

type FormatOptions = {
  unit?: string;
  unitWhiteSpace?: boolean;
  decimals?: number;
  accept_negative?: boolean;
  /** The value is a reading in W or Wh, so an explicit W/Wh-prefixed `unit` rescales it. */
  reading?: boolean;
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

/** An explicit unit's scale: a reading in kW is divided by 1000, any other value is kept. */
const explicitScale = (config: FlowCardPlusConfig, unit: string, reading: boolean): Scale => {
  const divisor = (reading ? powerUnitFactor(unit) : undefined) ?? 1;
  const decimalsByDivisor: Record<number, number | undefined> = {
    1: config.base_decimals,
    1000: config.kilo_decimals,
    1000000: config.mega_decimals,
  };
  return {
    divisor,
    unit,
    decimals: decimalsByDivisor[divisor],
    fallbackDecimals: divisor === 1 ? 0 : 2,
  };
};

/** The k/M scale a reading is shown in, or the explicit unit's scale when one is set. */
const scaleFor = (
  config: FlowCardPlusConfig,
  baseUnit: string,
  value: number,
  { unit, reading }: FormatOptions
): Scale => {
  if (unit !== undefined) {
    return explicitScale(config, unit, reading === true);
  }
  const base = { divisor: 1, unit: baseUnit, decimals: config.base_decimals, fallbackDecimals: 0 };
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

/** A reading as a card shows it: rounded, scaled to its k/M unit, with the decimals it was rounded to. */
export type ScaledReading = { value: number; unit: string; decimals: number };

/** `value` scaled and rounded like the formatted text, for showing number and unit apart. */
export const scaledReading = (
  config: FlowCardPlusConfig,
  family: UnitFamily,
  value: number,
  options: FormatOptions = {}
): ScaledReading => {
  const baseUnit = family === "energy" ? "Wh" : "W";
  const scale = scaleFor(config, baseUnit, value, options);
  const decimals = options.decimals ?? scale.decimals ?? scale.fallbackDecimals;
  return {
    value: round(value / scale.divisor, decimals),
    unit: nonEmpty(options.unit) ?? scale.unit,
    decimals,
  };
};

const displayValue = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  family: UnitFamily,
  value: number | string | null,
  options: FormatOptions
): string => {
  const { unit, unitWhiteSpace, accept_negative } = options;
  const whiteSpace = unitWhiteSpace === false ? "" : `\u2009`;
  const baseUnit = family === "energy" ? "Wh" : "W";

  if (value === null || value === undefined || value === "") {
    return `0${whiteSpace}${unit ?? baseUnit}`;
  }

  if (!isNumberValue(value)) {
    return value.toString();
  }

  const reading = scaledReading(config, family, Number(value), options);
  const v = formatNumber(
    accept_negative ? reading.value : Math.abs(reading.value),
    hass.locale,
    fractionDigitsFor(reading.decimals, config.keep_trailing_zeros === true)
  );

  return `${v}${whiteSpace}${reading.unit}`;
};
