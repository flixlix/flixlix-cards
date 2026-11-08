/**
 * Calendar periods the energy period selector offers. All dates are in the browser's time zone.
 */
// ponytail: browser time zone only; HA can use the server's (locale.time_zone = "server"),
// port its calcDate helpers if users with a different browser time zone report off-by-hours periods.
export type CalendarPeriod = "day" | "week" | "month" | "year";
export type SelectedPeriod = CalendarPeriod | "custom";

/** 0 = Sunday … 6 = Saturday, like `Date.getDay()`. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DateRange = { start: Date; end: Date };

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const isWeekdayIndex = (value: number): value is WeekdayIndex =>
  Number.isInteger(value) && value >= 0 && value <= 6;

/** `Intl.Locale#getWeekInfo()` (or the older `weekInfo` getter), where the browser has it. */
const languageFirstWeekday = (language: string): WeekdayIndex | undefined => {
  const locale: object = new Intl.Locale(language);
  const info: unknown =
    "getWeekInfo" in locale && typeof locale.getWeekInfo === "function"
      ? Reflect.apply(locale.getWeekInfo, locale, [])
      : "weekInfo" in locale
        ? locale.weekInfo
        : undefined;
  if (typeof info === "object" && info !== null && "firstDay" in info) {
    const day = Number(info.firstDay) % 7;
    return isWeekdayIndex(day) ? day : undefined;
  }
  return undefined;
};

/** The first day of the week from HA's profile setting (`first_weekday`), Monday if unknown. */
export const firstWeekday = (locale: {
  language: string;
  first_weekday?: string;
}): WeekdayIndex => {
  const index = WEEKDAYS.findIndex((day) => day === locale.first_weekday);
  if (isWeekdayIndex(index)) {
    return index;
  }
  try {
    return languageFirstWeekday(locale.language) ?? 1;
  } catch {
    return 1;
  }
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
/** Whole calendar days from `a` to `b`, unaffected by DST shifts. */
const calendarDaysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

/** The period of the given kind that contains `anchor`. */
export const periodRange = (
  period: CalendarPeriod,
  anchor: Date,
  weekStartsOn: WeekdayIndex
): DateRange => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  if (period === "day") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }
  if (period === "week") {
    const start = addDays(startOfDay(anchor), -((anchor.getDay() - weekStartsOn + 7) % 7));
    return { start, end: endOfDay(addDays(start, 6)) };
  }
  if (period === "month") {
    return { start: new Date(year, month, 1), end: endOfDay(new Date(year, month + 1, 0)) };
  }
  return { start: new Date(year, 0, 1), end: endOfDay(new Date(year, 11, 31)) };
};

/** Which calendar period a range covers exactly, or "custom" for any other range. */
export const detectPeriod = (
  { start, end }: DateRange,
  weekStartsOn: WeekdayIndex
): SelectedPeriod => {
  const periods: CalendarPeriod[] = ["day", "week", "month", "year"];
  return (
    periods.find((period) => {
      const range = periodRange(period, start, weekStartsOn);
      return sameDay(range.start, start) && sameDay(range.end, end);
    }) ?? "custom"
  );
};

/** The range one period before (`step` -1) or after (`step` 1) the given one. */
export const shiftPeriod = (
  period: SelectedPeriod,
  range: DateRange,
  step: 1 | -1,
  weekStartsOn: WeekdayIndex
): DateRange => {
  const { start, end } = range;
  if (period === "custom") {
    const days = (calendarDaysBetween(start, end) + 1) * step;
    return { start: startOfDay(addDays(start, days)), end: endOfDay(addDays(end, days)) };
  }
  const anchors: Record<CalendarPeriod, Date> = {
    day: addDays(start, step),
    week: addDays(start, 7 * step),
    month: new Date(start.getFullYear(), start.getMonth() + step, 1),
    year: new Date(start.getFullYear() + step, 0, 1),
  };
  return periodRange(period, anchors[period], weekStartsOn);
};

/** HA's own period preset names, as its energy collections remember them in localStorage. */
export const HA_PERIOD_PRESET: Record<CalendarPeriod, string> = {
  day: "today",
  week: "this_week",
  month: "this_month",
  year: "this_year",
};
