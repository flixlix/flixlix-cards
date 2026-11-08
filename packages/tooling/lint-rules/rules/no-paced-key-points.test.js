import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-paced-key-points.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-paced-key-points",
  rule,
  {
    valid: [
      'svg`<animateMotion dur="1s" calcMode="linear" keyPoints="1;0" keyTimes="0;1"></animateMotion>`',
      'svg`<animateMotion dur="1s" calcMode="paced"><mpath href="#a" /></animateMotion>`',
      "css`animateMotion { calcMode: paced; keyPoints: 1 }`",
    ],
    invalid: [
      {
        code: 'svg`<animateMotion dur="1s" calcMode="paced" keyPoints="1;0" keyTimes="0;1"></animateMotion>`',
        errors: 1,
      },
      {
        code: 'svg`<animateMotion\n  dur="${d}s"\n  calcMode="paced"\n  keyPoints="${inverted ? "0;1" : "1;0"}"\n  keyTimes="0;1"\n></animateMotion>`',
        errors: 1,
      },
      {
        code: 'html`<svg><animateMotion keyPoints="1;0" calcMode=paced></animateMotion></svg>`',
        errors: 1,
      },
    ],
  }
);
