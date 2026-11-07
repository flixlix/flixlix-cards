import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-index-fallback.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-index-fallback",
  rule,
  {
    valid: [
      "const i = items.findIndex((item) => item.id === id); if (i === -1) return;",
      "const value = items.find((item) => item.id === id) ?? fallback;",
    ],
    invalid: [
      { code: "const i = items.findIndex((item) => item.id === id) || 0;", errors: 1 },
      { code: "const i = names.indexOf(name) ?? 0;", errors: 1 },
    ],
  }
);
