import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-mwc-elements.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-mwc-elements",
  rule,
  {
    valid: [
      "html`<button @click=${pick}>${label}</button>`;",
      "html`<ha-card><ha-icon .icon=${icon}></ha-icon></ha-card>`;",
      'const tag = "<mwc-button>";',
    ],
    invalid: [
      { code: "html`<mwc-button dense outlined @click=${pick}>Today</mwc-button>`;", errors: 1 },
      {
        code: "html`<div>${x}<mwc-list><mwc-list-item></mwc-list-item></mwc-list></div>`;",
        errors: 2,
      },
    ],
  }
);
