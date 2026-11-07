import { describe, expect, test } from "vite-plus/test";
import { coerceNumber, isNumberValue, round } from "./utils";

describe("utils", () => {
  test("number coercion and array coercion helpers handle mixed inputs", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(isNumberValue("12.3")).toBe(true);
    expect(isNumberValue("12abc")).toBe(false);
    expect(coerceNumber("12.5")).toBe(12.5);
    expect(coerceNumber("nope", 99)).toBe(99);
  });
});
