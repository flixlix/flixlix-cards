import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./hacs-link-category.js";

RuleTester.describe = describe;
RuleTester.it = it;

const link = (category) =>
  `"https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=${category}"`;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "hacs-link-category",
  rule,
  {
    valid: [
      `const url = ${link("plugin")};`,
      `const url = ${link("integration")};`,
      'const url = "https://my.home-assistant.io/redirect/hacs_repository/?owner=a&repository=b";',
      "const url = `https://my.home-assistant.io/redirect/hacs_repository/?owner=${owner}&repository=${repo}&category=plugin`;",
    ],
    invalid: [
      { code: `const url = ${link("Dashboard")};`, errors: 1 },
      { code: `const url = ${link("dashboard")};`, errors: 1 },
      {
        code: "const url = `https://my.home-assistant.io/redirect/hacs_repository/?owner=${owner}&repository=${repo}&category=lovelace`;",
        errors: 1,
      },
    ],
  }
);
