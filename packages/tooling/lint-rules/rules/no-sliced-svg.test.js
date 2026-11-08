import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-sliced-svg.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run("no-sliced-svg", rule, {
  valid: [
    'html`<svg class="flow" viewBox=${box}><path d=${d}></path></svg>`;',
    'html`<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"></svg>`;',
    'const note = "preserveAspectRatio=\\"xMidYMid slice\\"";',
  ],
  invalid: [
    {
      code: 'html`<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><path d="M50,0 V100"></path></svg>`;',
      errors: 1,
    },
    { code: "svg`<svg preserveAspectRatio='none slice'>${dot}</svg>`;", errors: 1 },
  ],
});
