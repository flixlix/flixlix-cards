import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-reactive-mutation.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-reactive-mutation",
  rule,
  {
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
      {
        code: `class Card { @state() map = new Map(); drop(k) { this.map.delete(k); } }`,
        errors: 1,
      },
    ],
  }
);
