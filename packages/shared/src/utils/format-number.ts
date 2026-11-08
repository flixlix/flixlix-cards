import { type FrontendLocaleData, NumberFormat, numberFormatToLocale } from "custom-card-helpers";

const numberFormats = new Map<string, Intl.NumberFormat>();

const numberFormatFor = (locale: FrontendLocaleData | undefined): Intl.NumberFormat => {
  const locales = locale ? numberFormatToLocale(locale) : undefined;
  const key = String(locales);
  const cached = numberFormats.get(key);
  if (cached) {
    return cached;
  }
  const options = { maximumFractionDigits: 2 };
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

/**
 * `formatNumber` of custom-card-helpers for a number, reusing one `Intl.NumberFormat` per locale
 * instead of building one per value.
 */
export const formatNumber = (value: number, locale: FrontendLocaleData | undefined): string =>
  locale?.number_format === NumberFormat.none || Number.isNaN(value)
    ? (Math.round(value * 100) / 100).toString()
    : numberFormatFor(locale).format(value);
