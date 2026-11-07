import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-identity-arithmetic.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-identity-arithmetic",
  rule,
  {
    valid: ["const share = grid * (1 - fossil / 100);", "const half = x / 2;", "const y = 1 / x;"],
    invalid: [
      { code: "const share = grid * 1 - fossil / 100;", errors: 1 },
      { code: "const y = 1 * x;", errors: 1 },
      { code: "const y = x / 1;", errors: 1 },
    ],
  }
);
