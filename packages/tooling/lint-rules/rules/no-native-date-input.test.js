import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-native-date-input.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-native-date-input",
  rule,
  {
    valid: [
      "html`<ha-date-range-picker minimal .startDate=${start}></ha-date-range-picker>`;",
      'html`<input type="text" .value=${value}> <input type="number">`;',
      "html`<input .value=${value} @change=${onChange}>`;",
    ],
    invalid: [
      { code: 'html`<input type="date" .value=${start} />`;', errors: 1 },
      { code: "html`<input\n  aria-label=${label}\n  type=datetime-local>`;", errors: 1 },
      { code: "html`<input type='month'><input type=\"week\">`;", errors: 2 },
    ],
  }
);
