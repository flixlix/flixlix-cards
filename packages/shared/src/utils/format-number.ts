import { type FrontendLocaleData, NumberFormat, numberFormatToLocale } from "custom-card-helpers";

/** How many fraction digits to show; `minimum` pads with trailing zeros. */
export type FractionDigits = { minimum: number; maximum: number };

const defaultFractionDigits: FractionDigits = { minimum: 0, maximum: 2 };

const numberFormats = new Map<string, Intl.NumberFormat>();

const numberFormatFor = (
  locale: FrontendLocaleData | undefined,
  digits: FractionDigits
): Intl.NumberFormat => {
  const locales = locale ? numberFormatToLocale(locale) : undefined;
  const key = `${String(locales)}|${digits.minimum}|${digits.maximum}`;
  const cached = numberFormats.get(key);
  if (cached) {
    return cached;
  }
  const options = {
    minimumFractionDigits: digits.minimum,
    maximumFractionDigits: digits.maximum,
  };
  let numberFormat: Intl.NumberFormat;
  try {
    numberFormat = new Intl.NumberFormat(locales, options);
  } catch {
    // Home Assistant's "TEST" language is not a valid locale tag.
    numberFormat = new Intl.NumberFormat(undefined, options);
  }
  numberFormats.set(key, numberFormat);
  return numberFormat;
};

const MAX_FRACTION_DIGITS = 20;

const clampDigits = (digits: number) =>
  Math.min(Math.max(Math.trunc(digits), 0), MAX_FRACTION_DIGITS);

/** Fraction digits for a value rounded to `decimals`, padded with zeros when `keepTrailingZeros`. */
export const fractionDigitsFor = (decimals: number, keepTrailingZeros: boolean): FractionDigits => {
  const maximum = clampDigits(decimals);
  return { minimum: keepTrailingZeros ? maximum : 0, maximum };
};

const unformatted = (value: number, digits: FractionDigits): string => {
  const factor = 10 ** digits.maximum;
  const rounded = Math.round(value * factor) / factor;
  return digits.minimum > 0 ? rounded.toFixed(digits.minimum) : rounded.toString();
};

/**
 * `formatNumber` of custom-card-helpers for a number, reusing one `Intl.NumberFormat` per locale
 * and fraction digits instead of building one per value.
 */
export const formatNumber = (
  value: number,
  locale: FrontendLocaleData | undefined,
  digits: FractionDigits = defaultFractionDigits
): string =>
  locale?.number_format === NumberFormat.none || Number.isNaN(value)
    ? unformatted(value, digits)
    : numberFormatFor(locale, digits).format(value);
