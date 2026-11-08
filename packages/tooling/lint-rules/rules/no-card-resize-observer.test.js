import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-card-resize-observer.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-card-resize-observer",
  rule,
  {
    valid: [
      'class Card { private readonly _width = new WidthController(this, ".stage > svg"); }',
      "const observer: ResizeObserver | undefined = undefined;",
    ],
    invalid: [
      {
        code: "this._resizeObserver ??= new ResizeObserver(([entry]) => { this._width = 1; });",
        errors: 1,
      },
      { code: "const observer = new ResizeObserver(() => {});", errors: 1 },
    ],
  }
);
