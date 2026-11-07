import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import plugin from "./index.js";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("no-index-fallback", plugin.rules["no-index-fallback"], {
  valid: [
    "const i = items.findIndex((item) => item.id === id); if (i === -1) return;",
    "const value = items.find((item) => item.id === id) ?? fallback;",
  ],
  invalid: [
    { code: "const i = items.findIndex((item) => item.id === id) || 0;", errors: 1 },
    { code: "const i = names.indexOf(name) ?? 0;", errors: 1 },
  ],
});

tester.run("no-identity-arithmetic", plugin.rules["no-identity-arithmetic"], {
  valid: ["const share = grid * (1 - fossil / 100);", "const half = x / 2;", "const y = 1 / x;"],
  invalid: [
    { code: "const share = grid * 1 - fossil / 100;", errors: 1 },
    { code: "const y = 1 * x;", errors: 1 },
    { code: "const y = x / 1;", errors: 1 },
  ],
});

tester.run("no-reactive-mutation", plugin.rules["no-reactive-mutation"], {
  valid: [
    `class Card { @state() results = {}; update(k, v) { this.results = { ...this.results, [k]: v }; } }`,
    `class Card { cache = {}; update(k, v) { this.cache[k] = v; this.cache.list.push(v); } }`,
    `class Card { @state() items = []; read() { return this.items.slice(); } }`,
  ],
  invalid: [
    {
      code: `class Card { @state() results = {}; update(k, v) { this.results[k] = v; } }`,
      errors: 1,
    },
    {
      code: `class Card { @property() config = {}; set() { this.config.entities.grid = 1; } }`,
      errors: 1,
    },
    { code: `class Card { @state() items = []; add(v) { this.items.push(v); } }`, errors: 1 },
    { code: `class Card { @state() counts = {}; bump(k) { this.counts[k]++; } }`, errors: 1 },
    { code: `class Card { @state() map = new Map(); drop(k) { this.map.delete(k); } }`, errors: 1 },
  ],
});
