import { describe, expect, test } from "vite-plus/test";

import * as fs from "node:fs";
import * as path from "node:path";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function getAllKeys(obj: unknown): string[] {
  if (!isRecord(obj)) {
    return [];
  }
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    keys.push(key);
    for (const nestedKey of getAllKeys(value)) {
      keys.push(`${key}.${nestedKey}`);
    }
  }
  return keys;
}

describe("Language files", () => {
  const languagesDir = path.resolve(__dirname, "../languages");
  const languageFiles = fs.readdirSync(languagesDir).filter((file) => file.endsWith(".json"));
  languageFiles.sort();

  const readLanguage = (file: string): unknown =>
    JSON.parse(fs.readFileSync(path.join(languagesDir, file), "utf8"));

  const enFile = "en.json";
  const enKeys = getAllKeys(readLanguage(enFile));

  test.each(languageFiles.filter((file) => file !== enFile))(
    "%s should have the same properties as en.json",
    (languageFile) => {
      const languageKeys = getAllKeys(readLanguage(languageFile));
      expect(languageKeys).toEqual(enKeys);
    }
  );
});
