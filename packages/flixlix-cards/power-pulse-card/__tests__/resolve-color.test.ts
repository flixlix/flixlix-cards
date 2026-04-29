import { describe, expect, test } from "vitest";
import { resolveColor } from "../src/utils/resolve-color";

const FALLBACK = "var(--primary-color, #fff)";

describe("resolveColor", () => {
  test("falls back when value is empty / null / undefined / 'default'", () => {
    expect(resolveColor(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveColor(null, FALLBACK)).toBe(FALLBACK);
    expect(resolveColor("", FALLBACK)).toBe(FALLBACK);
    expect(resolveColor("default", FALLBACK)).toBe(FALLBACK);
  });

  test("maps named HA palette colors to their CSS variable with hex fallback", () => {
    expect(resolveColor("primary", FALLBACK)).toBe("var(--primary-color, #03a9f4)");
    expect(resolveColor("deep-orange", FALLBACK)).toBe("var(--deep-orange-color, #ff6f22)");
    expect(resolveColor("blue-grey", FALLBACK)).toBe("var(--blue-grey-color, #607d8b)");
  });

  test("passes hex / rgb / hsl strings through unchanged", () => {
    expect(resolveColor("#ff00aa", FALLBACK)).toBe("#ff00aa");
    expect(resolveColor("rgb(10, 20, 30)", FALLBACK)).toBe("rgb(10, 20, 30)");
    expect(resolveColor("hsl(120, 50%, 50%)", FALLBACK)).toBe("hsl(120, 50%, 50%)");
  });

  test("trims whitespace before matching", () => {
    expect(resolveColor("  red  ", FALLBACK)).toBe("var(--red-color, #f44336)");
  });

  test("accepts the object form { color: name } from newer ui_color selectors", () => {
    expect(resolveColor({ color: "green" }, FALLBACK)).toBe("var(--green-color, #4caf50)");
  });

  test("unknown name is returned as-is (treated as a custom CSS color string)", () => {
    expect(resolveColor("salmon", FALLBACK)).toBe("salmon");
    expect(resolveColor("var(--my-custom)", FALLBACK)).toBe("var(--my-custom)");
  });
});
