import type { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../data/translation";
import { resolveTimeZone } from "./resolve-time-zone";

export const formatDateMonth = (dateObj: Date, locale: FrontendLocaleData, config: HassConfig) =>
  formatDateMonthMem(locale, config.time_zone).format(dateObj);

const formatDateMonthMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

export const formatDateMonthShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatDateMonthShortMem(locale, config.time_zone).format(dateObj);

const formatDateMonthShortMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "short",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

export const formatDateVeryShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatDateVeryShortMem(locale, config.time_zone).format(dateObj);

const formatDateVeryShortMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      day: "numeric",
      month: "short",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

export const formatDateYear = (dateObj: Date, locale: FrontendLocaleData, config: HassConfig) =>
  formatDateYearMem(locale, config.time_zone).format(dateObj);

const formatDateYearMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);
