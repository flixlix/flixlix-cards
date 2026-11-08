import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-unsupported-runtime-apis.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-unsupported-runtime-apis",
  rule,
  {
    valid: [
      "const first = names[0];",
      "const last = names[names.length - 1];",
      "const sorted = [...items].sort(compare);",
      "Object.prototype.hasOwnProperty.call(config, key);",
      "const copy = JSON.parse(JSON.stringify(value));",
      "names.map((name) => name.trim());",
    ],
    invalid: [
      { code: "const first = names.at(0);", errors: 1 },
      { code: 'const text = label.replaceAll("_", " ");', errors: 1 },
      { code: "const sorted = items.toSorted(compare);", errors: 1 },
      { code: "const last = items.findLast((item) => item.has);", errors: 1 },
      { code: "Object.hasOwn(config, key);", errors: 1 },
      { code: "const copy = structuredClone(value);", errors: 1 },
    ],
  }
);
