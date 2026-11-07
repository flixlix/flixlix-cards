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

const displayValue = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  family: UnitFamily,
  value: number | string | null,
  { unit, unitWhiteSpace, decimals, accept_negative }: FormatOptions
): string => {
  const thinSpace = `\u2009`;
  const whiteSpace = unitWhiteSpace === false ? "" : thinSpace;
  const baseUnit = family === "energy" ? "Wh" : "W";
  const kiloUnit = `k${baseUnit}`;
  const megaUnit = `M${baseUnit}`;

  if (value === null || value === undefined || value === "") {
    return `0${whiteSpace}${unit ?? baseUnit}`;
  }

  if (!isNumberValue(value)) {
    return value.toString();
  }

  const valueInNumber = Number(value);

  const isKilo =
    unit === undefined && valueInNumber >= (config.kilo_threshold ?? defaultValues.kiloThreshold);
  const isMega =
    unit === undefined && valueInNumber >= (config.mega_threshold ?? defaultValues.megaThreshold);

  const decimalsToRound =
    decimals ??
    (isMega ? config.mega_decimals : isKilo ? config.kilo_decimals : config.base_decimals);

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

  return `${v}${whiteSpace}${nonEmpty(unit) ?? (isMega ? megaUnit : isKilo ? kiloUnit : baseUnit)}`;
};
