import {
  type FrontendLocaleData,
  formatNumber as helpersFormatNumber,
  NumberFormat,
  TimeFormat,
} from "custom-card-helpers";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { formatNumber } from "./format-number";

const locale = (language: string, number_format: NumberFormat): FrontendLocaleData => ({
  language,
  number_format,
  time_format: TimeFormat.language,
});

const locales = [
  undefined,
  ...["en", "de", "fr", "pt-BR", "TEST"].flatMap((language) =>
    Object.values(NumberFormat).map((format) => locale(language, format))
  ),
];

const values = [0, 1, -1, 0.5, 1.005, 12.345, 999.999, 1234.5, -98765.4321, 1e7, Number.NaN];

describe("formatNumber", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("formats like custom-card-helpers", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const options of locales) {
      for (const value of values) {
        expect(formatNumber(value, options), `${value} ${JSON.stringify(options)}`).toBe(
          helpersFormatNumber(value, options)
        );
      }
    }
  });

  test("builds one number format per locale", () => {
    const construct = vi.spyOn(Intl, "NumberFormat");
    const dutch = locale("nl", NumberFormat.language);
    const swiss = locale("de-CH", NumberFormat.language);
    for (const value of values) {
      formatNumber(value, dutch);
      formatNumber(value, swiss);
    }
    expect(construct).toHaveBeenCalledTimes(2);
  });
});
