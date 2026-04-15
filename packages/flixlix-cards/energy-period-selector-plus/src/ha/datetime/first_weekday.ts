import { getWeekStartByLocale } from "weekstart";
import type { FrontendLocaleData } from "../data/translation";
import { FirstWeekday } from "../data/translation";
import { WEEKDAYS_LONG, type WeekdayIndex } from "./weekday";

export const firstWeekdayIndex = (locale: FrontendLocaleData): WeekdayIndex => {
  if (locale.first_weekday === FirstWeekday.language) {
    if ("weekInfo" in Intl.Locale.prototype) {
      return ((new Intl.Locale(locale.language) as any).weekInfo.firstDay % 7) as WeekdayIndex;
    }
    return (getWeekStartByLocale(locale.language) % 7) as WeekdayIndex;
  }
  return WEEKDAYS_LONG.includes(locale.first_weekday as any)
    ? (WEEKDAYS_LONG.indexOf(locale.first_weekday as any) as WeekdayIndex)
    : 1;
};

export const firstWeekday = (locale: FrontendLocaleData) => {
  const index = firstWeekdayIndex(locale);
  return WEEKDAYS_LONG[index];
};
