import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-entity-undefined-check.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-entity-undefined-check",
  rule,
  {
    valid: [
      "const has = hasEntity(entities.solar);",
      "const has = !!solar?.entity;",
      "const missing = solar === undefined;",
      'const named = node.entity === "sensor.solar";',
    ],
    invalid: [
      { code: "const has = entities.grid?.entity !== undefined;", errors: 1 },
      { code: "const has = home.entity != undefined;", errors: 1 },
      { code: "const missing = undefined === solar?.entity;", errors: 1 },
    ],
  }
);
