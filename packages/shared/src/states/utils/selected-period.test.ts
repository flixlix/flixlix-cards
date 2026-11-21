import { describe, expect, test } from "vite-plus/test";
import {
  detectPeriod,
  firstWeekday,
  parseStartDate,
  type PeriodContext,
  type PeriodDefinition,
  periodDefinitionError,
  periodRange,
  shiftPeriod,
} from "./selected-period";

const date = (month: number, day: number, year = 2024) => new Date(year, month - 1, day);
const NOW = new Date(2024, 4, 15, 14, 30);
const MONDAY: PeriodContext = { weekStartsOn: 1, now: NOW };
const SUNDAY: PeriodContext = { weekStartsOn: 0, now: NOW };
const endOf = (month: number, day: number, year = 2024) =>
  new Date(year, month - 1, day, 23, 59, 59, 999);

describe("periodRange", () => {
  test.each([
    { period: "day", start: date(5, 15), end: endOf(5, 15) },
    { period: "week", start: date(5, 13), end: endOf(5, 19) },
    { period: "month", start: date(5, 1), end: endOf(5, 31) },
    { period: "year", start: date(1, 1), end: endOf(12, 31) },
  ] as const)("the $period around Wednesday 15 May 2024", ({ period, start, end }) => {
    expect(periodRange(period, new Date(2024, 4, 15, 14, 30), MONDAY)).toEqual({ start, end });
  });

  test("weeks start on the configured weekday", () => {
    expect(periodRange("week", date(5, 15), SUNDAY)).toEqual({
      start: date(5, 12),
      end: endOf(5, 18),
    });
  });

  test("February of a leap year has 29 days", () => {
    expect(periodRange("month", date(2, 10), MONDAY).end).toEqual(endOf(2, 29));
  });
});

describe("detectPeriod", () => {
  test.each([
    { name: "a single day", start: date(5, 15), end: endOf(5, 15), expected: "day" },
    { name: "a Monday-to-Sunday week", start: date(5, 13), end: endOf(5, 19), expected: "week" },
    { name: "a whole month", start: date(2, 1), end: endOf(2, 29), expected: "month" },
    { name: "a whole year", start: date(1, 1), end: endOf(12, 31), expected: "year" },
    {
      name: "seven days not aligned to a week",
      start: date(5, 14),
      end: endOf(5, 20),
      expected: "custom",
    },
    { name: "30 days across two months", start: date(5, 10), end: endOf(6, 8), expected: "custom" },
    { name: "the year to date", start: date(1, 1), end: endOf(5, 15), expected: "custom" },
  ])("$name is $expected", ({ start, end, expected }) => {
    expect(detectPeriod({ start, end }, MONDAY)).toBe(expected);
  });

  test("a Sunday-to-Saturday week is a week only when weeks start on Sunday", () => {
    const range = { start: date(5, 12), end: endOf(5, 18) };
    expect(detectPeriod(range, SUNDAY)).toBe("week");
    expect(detectPeriod(range, MONDAY)).toBe("custom");
  });
});

describe("shiftPeriod", () => {
  test("steps a day back across a month boundary", () => {
    expect(shiftPeriod("day", periodRange("day", date(3, 1), MONDAY), -1, MONDAY)).toEqual({
      start: date(2, 29),
      end: endOf(2, 29),
    });
  });

  test("steps to the next week", () => {
    expect(shiftPeriod("week", periodRange("week", date(5, 15), MONDAY), 1, MONDAY)).toEqual({
      start: date(5, 20),
      end: endOf(5, 26),
    });
  });

  test("steps from January back into December of the previous year", () => {
    expect(shiftPeriod("month", periodRange("month", date(1, 20), MONDAY), -1, MONDAY)).toEqual({
      start: date(12, 1, 2023),
      end: endOf(12, 31, 2023),
    });
  });

  test("steps to the next year", () => {
    expect(shiftPeriod("year", periodRange("year", date(6, 1), MONDAY), 1, MONDAY)).toEqual({
      start: date(1, 1, 2025),
      end: endOf(12, 31, 2025),
    });
  });

  test("moves a custom range by its own length, across a DST change", () => {
    const range = { start: date(3, 25), end: endOf(3, 31) };
    expect(shiftPeriod("custom", range, 1, MONDAY)).toEqual({
      start: date(4, 1),
      end: endOf(4, 7),
    });
  });
});

describe("firstWeekday", () => {
  test("uses the weekday picked in the HA profile", () => {
    expect(firstWeekday({ language: "en", first_weekday: "sunday" })).toBe(0);
    expect(firstWeekday({ language: "en-US", first_weekday: "saturday" })).toBe(6);
  });

  test("follows the language when the profile says so", () => {
    expect(firstWeekday({ language: "de", first_weekday: "language" })).toBe(1);
  });

  test("falls back to Monday for an unknown language", () => {
    expect(firstWeekday({ language: "not a language" })).toBe(1);
  });
});

const bill = (starts: string, duration: PeriodDefinition["duration"] = { months: 1 }) => ({
  label: "Bill",
  duration,
  starts,
});
const rangeOf = (definition: PeriodDefinition, anchor: Date, context = MONDAY) =>
  periodRange(definition, anchor, context);

describe("defined periods", () => {
  test("a monthly bill on the 8th runs from the 8th to the 7th", () => {
    const definition = bill("2024-01-08");
    expect(rangeOf(definition, date(5, 7))).toEqual({ start: date(4, 8), end: endOf(5, 7) });
    expect(rangeOf(definition, date(5, 8))).toEqual({ start: date(5, 8), end: endOf(6, 7) });
  });

  test("lines up to `starts` before and after it, whatever its year", () => {
    expect(rangeOf(bill("2030-03-08"), date(5, 20))).toEqual({
      start: date(5, 8),
      end: endOf(6, 7),
    });
  });

  test("a bill on the 31st starts on the last day of shorter months", () => {
    const definition = bill("2024-01-31");
    expect(rangeOf(definition, date(2, 29))).toEqual({ start: date(2, 29), end: endOf(3, 30) });
    expect(rangeOf(definition, date(3, 31))).toEqual({ start: date(3, 31), end: endOf(4, 29) });
    expect(rangeOf(definition, date(2, 28, 2025))).toEqual({
      start: date(2, 28, 2025),
      end: endOf(3, 30, 2025),
    });
  });

  test("previous and next do not drift on a bill on the 31st", () => {
    const definition = bill("2024-01-31");
    const february = rangeOf(definition, date(3, 1));
    const march = shiftPeriod(definition, february, 1, MONDAY);
    expect(march).toEqual({ start: date(3, 31), end: endOf(4, 29) });
    expect(shiftPeriod(definition, march, -1, MONDAY)).toEqual(february);
  });

  test("steps from a December bill into the next year", () => {
    const definition = bill("2024-01-08");
    expect(shiftPeriod(definition, rangeOf(definition, date(12, 20)), 1, MONDAY)).toEqual({
      start: date(1, 8, 2025),
      end: endOf(2, 7, 2025),
    });
  });

  test("quarters, contract years and fortnights", () => {
    expect(rangeOf(bill("2024-02-15", { months: 3 }), date(6, 1))).toEqual({
      start: date(5, 15),
      end: endOf(8, 14),
    });
    expect(rangeOf(bill("2023-04-01", { years: 1 }), date(2, 1))).toEqual({
      start: date(4, 1, 2023),
      end: endOf(3, 31),
    });
    expect(rangeOf(bill("2024-01-01", { weeks: 2 }), date(1, 20))).toEqual({
      start: date(1, 15),
      end: endOf(1, 28),
    });
  });

  test("whole days across a DST change", () => {
    expect(rangeOf(bill("2024-03-01", { days: 30 }), date(3, 31))).toEqual({
      start: date(3, 31),
      end: endOf(4, 29),
    });
  });

  test("without `starts` the period ends today and steps back by its length", () => {
    const last30: PeriodDefinition = { label: "Last 30 days", duration: { days: 30 } };
    const current = rangeOf(last30, NOW);
    expect(current).toEqual({ start: date(4, 16), end: endOf(5, 15) });
    expect(shiftPeriod(last30, current, -1, MONDAY)).toEqual({
      start: date(3, 17),
      end: endOf(4, 15),
    });
    expect(rangeOf({ label: "Last month", duration: { months: 1 } }, NOW)).toEqual({
      start: date(4, 16),
      end: endOf(5, 15),
    });
  });

  test("detects a defined period only among the given periods, in their order", () => {
    const definition = bill("2024-01-08");
    const range = { start: date(5, 8), end: endOf(6, 7) };
    expect(detectPeriod(range, MONDAY)).toBe("custom");
    expect(detectPeriod(range, MONDAY, ["month", definition])).toBe(definition);

    const onTheFirst = bill("2024-01-01");
    const may = periodRange("month", NOW, MONDAY);
    expect(detectPeriod(may, MONDAY, [onTheFirst, "month"])).toBe(onTheFirst);
    expect(detectPeriod(may, MONDAY, ["month", onTheFirst])).toBe("month");
  });
});

describe("period definitions from the config", () => {
  test("reads `starts` as the local day, from YAML strings and HA's parsed dates", () => {
    expect(parseStartDate("2026-01-08")).toEqual(new Date(2026, 0, 8));
    expect(parseStartDate(new Date(Date.UTC(2026, 0, 8)))).toEqual(new Date(2026, 0, 8));
    expect(parseStartDate("2026-02-30")).toBeUndefined();
    expect(parseStartDate("8 January")).toBeUndefined();
  });

  test.each([
    { label: "Bill", duration: { months: 1 }, starts: "2026-01-08" },
    { label: "Last 7 days", duration: { days: 7 } },
  ])("accepts $label", (value) => {
    expect(periodDefinitionError(value)).toBeUndefined();
  });

  test.each([
    { value: "decade", error: /period name/ },
    { value: { duration: { months: 1 } }, error: /label/ },
    { value: { label: "Bill" }, error: /duration/ },
    { value: { label: "Bill", duration: { months: 1, days: 2 } }, error: /duration/ },
    { value: { label: "Bill", duration: { months: 0 } }, error: /duration/ },
    { value: { label: "Bill", duration: { months: 1.5 } }, error: /duration/ },
    { value: { label: "Bill", duration: { hours: 1 } }, error: /duration/ },
    { value: { label: "Bill", duration: { months: 1 }, starts: "soon" }, error: /starts/ },
  ])("rejects $value", ({ value, error }) => {
    expect(periodDefinitionError(value)).toMatch(error);
  });
});
