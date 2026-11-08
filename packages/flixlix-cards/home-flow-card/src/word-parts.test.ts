import { describe, expect, test } from "vite-plus/test";
import { wordParts } from "./word-parts";

describe("wordParts", () => {
  test.each([
    ["discharging", "charging", ["", "dis", "charging"]],
    ["charging", "discharging", ["", "", "charging"]],
    ["entlädt", "lädt", ["", "ent", "lädt"]],
    ["en décharge", "en charge", ["en ", "dé", "charge"]],
    ["laddar ur", "laddar", ["laddar", " ur", ""]],
    ["разряжается", "заряжается", ["", "раз", "ряжается"]],
    ["aa", "aaa", ["aa", "", ""]],
    ["", "charging", ["", "", ""]],
  ])("%s against %s", (word, other, parts) => {
    expect(wordParts(word, other)).toEqual(parts);
  });
});
