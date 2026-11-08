import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-card-type-sniffing.js";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("no-card-type-sniffing", rule, {
  valid: [
    "const unit = readings.family === 'energy' ? 'Wh' : 'W';",
    "if (entity.type === 'sensor') {}",
    "const card = { type: config.type };",
    "if (action.type.startsWith('call')) {}",
  ],
  invalid: [
    { code: "const energy = config.type.includes('energy-flow-card-plus');", errors: 1 },
    { code: "if (this._config.type === 'custom:energy-flow-card-plus') {}", errors: 1 },
    { code: "if ('custom:power-flow-card-plus' !== cardConfig.type) {}", errors: 1 },
    { code: "const energy = config?.type.startsWith('custom:energy');", errors: 1 },
  ],
});
