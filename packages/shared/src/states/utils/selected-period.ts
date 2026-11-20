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

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
/** `months` months after `date`, on the same day or the month's last day if it is shorter. */
const addMonths = (date: Date, months: number) => {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
};

export const DURATION_UNITS = ["days", "weeks", "months", "years"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];
/** Exactly one unit, like HA's `{ days: 1 }` durations: `{ months: 1 }`. */
export type PeriodDuration = Partial<Record<DurationUnit, number>>;

/**
 * A period the user defines: `duration` long, repeating from `starts` in both directions. Without
 * `starts`, one of the periods ends today (a rolling "last 30 days").
 */
export type PeriodDefinition = {
  label: string;
  duration: PeriodDuration;
  /** `YYYY-MM-DD` (a `Date` when HA's YAML editor parsed the date). */
  starts?: string | Date;
};

export type Period = CalendarPeriod | PeriodDefinition;

/** What period ranges depend on besides the period. `now` decides where rolling periods end. */
export type PeriodContext = { weekStartsOn: WeekdayIndex; now: Date };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The single unit and count of a duration, or undefined if it is not exactly one positive unit. */
export const durationParts = (
  duration: unknown
): { unit: DurationUnit; count: number } | undefined => {
  if (!isRecord(duration)) {
    return undefined;
  }
  const keys = Object.keys(duration);
  const unit = DURATION_UNITS.find((candidate) => candidate === keys[0]);
  const count = unit ? duration[unit] : undefined;
  return keys.length === 1 &&
    unit &&
    typeof count === "number" &&
    Number.isInteger(count) &&
    count > 0
    ? { unit, count }
    : undefined;
};

/**
 * The local day of `starts`. HA's YAML editor turns `2026-01-08` into a Date at UTC midnight and
 * YAML-mode dashboards send `"2026-01-08"`, so both read as 8 January wherever the browser is.
 */
export const parseStartDate = (starts: unknown): Date | undefined => {
  const parts =
    starts instanceof Date
      ? [starts.getUTCFullYear(), starts.getUTCMonth() + 1, starts.getUTCDate()]
      : typeof starts === "string"
        ? /^(\d{4})-(\d{2})-(\d{2})/.exec(starts.trim())?.slice(1).map(Number)
        : undefined;
  if (!parts) {
    return undefined;
  }
  const [year = 0, month = 0, day = 0] = parts;
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
};

/** Why a `period_buttons` entry is no valid period definition, or undefined if it is one. */
export const periodDefinitionError = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return "must be a period name or a period with `label` and `duration`";
  }
  if (typeof value.label !== "string" || value.label.trim() === "") {
    return "needs a `label`";
  }
  if (!durationParts(value.duration)) {
    return `\`duration\` must be one of ${DURATION_UNITS.join(", ")} with a whole number above 0, like \`{ months: 1 }\``;
  }
  if (value.starts !== undefined && !parseStartDate(value.starts)) {
    return "`starts` must be a date like 2026-01-08";
  }
  return undefined;
};

export const isPeriodDefinition = (value: unknown): value is PeriodDefinition =>
  periodDefinitionError(value) === undefined;

const definitionRange = (definition: PeriodDefinition, anchor: Date, now: Date): DateRange => {
  const parts = durationParts(definition.duration) ?? { unit: "days", count: 1 };
  const inMonths = parts.unit === "months" || parts.unit === "years";
  const length = parts.count * (parts.unit === "weeks" ? 7 : parts.unit === "years" ? 12 : 1);
  const step = (origin: Date, times: number) =>
    inMonths ? addMonths(origin, length * times) : addDays(origin, length * times);
  // ponytail: a rolling period lines up so that one of them ends today.
  const origin = parseStartDate(definition.starts) ?? addDays(step(startOfDay(now), -1), 1);
  const elapsed = inMonths
    ? (anchor.getFullYear() - origin.getFullYear()) * 12 + anchor.getMonth() - origin.getMonth()
    : calendarDaysBetween(origin, anchor);
  let index = Math.floor(elapsed / length);
  if (step(origin, index) > anchor) {
    index -= 1;
  }
  return { start: step(origin, index), end: endOfDay(addDays(step(origin, index + 1), -1)) };
};

/** The period of the given kind that contains `anchor`. */
export const periodRange = (
  period: Period,
  anchor: Date,
  { weekStartsOn, now }: PeriodContext
): DateRange => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  if (typeof period === "object") {
    return definitionRange(period, anchor, now);
  }
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

export const CALENDAR_PERIODS: readonly CalendarPeriod[] = ["day", "week", "month", "year"];

/** The first of `periods` that covers the range exactly, or "custom" if none does. */
export const detectPeriod = (
  { start, end }: DateRange,
  context: PeriodContext,
  periods: readonly Period[] = CALENDAR_PERIODS
): Period | "custom" =>
  periods.find((period) => {
    const range = periodRange(period, start, context);
    return sameDay(range.start, start) && sameDay(range.end, end);
  }) ?? "custom";

/** The range one period before (`step` -1) or after (`step` 1) the given one. */
export const shiftPeriod = (
  period: Period | "custom",
  { start, end }: DateRange,
  step: 1 | -1,
  context: PeriodContext
): DateRange => {
  if (period === "custom") {
    const days = (calendarDaysBetween(start, end) + 1) * step;
    return { start: startOfDay(addDays(start, days)), end: endOfDay(addDays(end, days)) };
  }
  return periodRange(period, step === 1 ? addDays(end, 1) : addDays(start, -1), context);
};

/** HA's own period preset names, as its energy collections remember them in localStorage. */
export const HA_PERIOD_PRESET: Record<CalendarPeriod, string> = {
  day: "today",
  week: "this_week",
  month: "this_month",
  year: "this_year",
};
