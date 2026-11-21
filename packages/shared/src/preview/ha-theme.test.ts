import { describe, expect, test } from "vite-plus/test";

import { haThemeDark, haThemeLight } from "./ha-theme";

/**
 * The themes are set as one inline style, so a single malformed declaration (an unclosed bracket)
 * makes the browser drop every declaration after it, including the dashboard's font.
 */
const malformed = (theme: string) =>
  theme
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const opens = (line.match(/[({[]/g) ?? []).length;
      const closes = (line.match(/[)}\]]/g) ?? []).length;
      return !/^--[\w-]+:.*;$/.test(line) || opens !== closes || line.includes("@");
    });

describe("Home Assistant theme", () => {
  test.each([
    ["light", haThemeLight],
    ["dark", haThemeDark],
  ])("%s declares only well-formed custom properties", (_, theme) => {
    expect(malformed(theme)).toEqual([]);
  });
});
