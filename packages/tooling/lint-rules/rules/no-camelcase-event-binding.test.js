import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-camelcase-event-binding.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-camelcase-event-binding",
  rule,
  {
    valid: [
      "html`<div @keydown=${onKey} @value-changed=${onChange}></div>`;",
      "html`<input .valueAsNumber=${value} ?disabled=${off}>`;",
      "css`a { --x: ${y}; }`;",
    ],
    invalid: [
      { code: "html`<div @keyDown=${onKey}></div>`;", errors: 1 },
      { code: 'svg`<g @pointerDown="${onDown}" @click=${onClick}></g>`;', errors: 1 },
    ],
  }
);
