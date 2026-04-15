import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addMilliseconds,
  addMonths,
  differenceInDays,
  differenceInMilliseconds,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  startOfDay,
} from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../data/translation";
import { TimeZone } from "../data/translation";

const calcZonedDate = (
  date: Date,
  tz: string,
  fn: (date: Date, options?: any) => Date | number | boolean,
  options?: any
) => {
  const tzDate = new TZDate(date, tz);
  const fnResult = fn(tzDate, options);
  if (fnResult instanceof Date) {
    return new Date(fnResult.getTime());
  }
  return fnResult;
};

export const calcDate = (
  date: Date,
  fn: (date: Date, options?: any) => Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  options?: any
) =>
  locale.time_zone === TimeZone.server
    ? (calcZonedDate(date, config.time_zone, fn, options) as Date)
    : fn(date, options);

export const calcDateProperty = (
  date: Date,
  fn: (date: Date, options?: any) => boolean | number,
  locale: FrontendLocaleData,
  config: HassConfig,
  options?: any
) =>
  locale.time_zone === TimeZone.server
    ? (calcZonedDate(date, config.time_zone, fn, options) as number | boolean)
    : fn(date, options);

export const calcDateDifferenceProperty = (
  endDate: Date,
  startDate: Date,
  fn: (date: Date, options?: any) => boolean | number,
  locale: FrontendLocaleData,
  config: HassConfig
) =>
  calcDateProperty(
    endDate,
    fn,
    locale,
    config,
    locale.time_zone === TimeZone.server ? new TZDate(startDate, config.time_zone) : startDate
  );

export const shiftDateRange = (
  startDate: Date,
  endDate: Date,
  forward: boolean,
  locale: FrontendLocaleData,
  config: any
): { start: Date; end: Date } => {
  let start: Date;
  let end: Date;
  if (
    (calcDateProperty(startDate, isFirstDayOfMonth, locale, config) as boolean) &&
    (calcDateProperty(endDate, isLastDayOfMonth, locale, config) as boolean)
  ) {
    const difference = (((calcDateDifferenceProperty(
      endDate,
      startDate,
      differenceInMonths,
      locale,
      config
    ) as number) +
      1) *
      (forward ? 1 : -1)) as number;
    start = calcDate(startDate, addMonths, locale, config, difference);
    end = calcDate(
      calcDate(endDate, addMonths, locale, config, difference),
      endOfMonth,
      locale,
      config
    );
  } else if (
    calcDateProperty(
      startDate,
      (date) => startOfDay(date).getMilliseconds() === date.getMilliseconds(),
      locale,
      config
    ) &&
    calcDateProperty(
      endDate,
      (date) => endOfDay(date).getMilliseconds() === date.getMilliseconds(),
      locale,
      config
    )
  ) {
    const difference = (((calcDateDifferenceProperty(
      endDate,
      startDate,
      differenceInDays,
      locale,
      config
    ) as number) +
      1) *
      (forward ? 1 : -1)) as number;
    start = calcDate(startDate, addDays, locale, config, difference);
    end = calcDate(endDate, addDays, locale, config, difference);
  } else {
    const difference = ((calcDateDifferenceProperty(
      endDate,
      startDate,
      differenceInMilliseconds,
      locale,
      config
    ) as number) * (forward ? 1 : -1)) as number;
    start = calcDate(startDate, addMilliseconds, locale, config, difference);
    end = calcDate(endDate, addMilliseconds, locale, config, difference);
  }
  return { start, end };
};
