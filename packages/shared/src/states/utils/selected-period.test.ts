import { describe, expect, test } from "vite-plus/test";
import { detectPeriod, firstWeekday, periodRange, shiftPeriod } from "./selected-period";

const MONDAY = 1;
const SUNDAY = 0;
const date = (month: number, day: number, year = 2024) => new Date(year, month - 1, day);
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
    expect(firstWeekday({ language: "de", first_weekday: "language" })).toBe(MONDAY);
  });

  test("falls back to Monday for an unknown language", () => {
    expect(firstWeekday({ language: "not a language" })).toBe(MONDAY);
  });
});
