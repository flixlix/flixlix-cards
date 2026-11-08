import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./no-mutation.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run("no-mutation", rule, {
  valid: [
    `const total = values.reduce((sum, value) => sum + value, 0);`,
    `const next = { ...pools, grid: pools.grid - amount };`,
    `const sorted = sortedBy(items, compare);`,
    `const has = seen.has(key); const value = lookup.get(key);`,
    `for (const value of values) { use(value); }`,
    `const f = ({ a = 1 } = {}) => a;`,
  ],
  invalid: [
    { code: `let total = 0;`, errors: [{ messageId: "binding" }] },
    { code: `var total = 0;`, errors: [{ messageId: "binding" }] },
    {
      code: `for (let i = 0; i < 3; i++) {}`,
      errors: [{ messageId: "binding" }, { messageId: "update" }],
    },
    { code: `const x = {}; x.a = 1;`, errors: [{ messageId: "assignment" }] },
    { code: `const x = {}; x["a"] = 1;`, errors: [{ messageId: "assignment" }] },
    { code: `function f(total) { total += 1; }`, errors: [{ messageId: "assignment" }] },
    { code: `function f(x) { x.count--; }`, errors: [{ messageId: "update" }] },
    { code: `const x = { a: 1 }; delete x.a;`, errors: [{ messageId: "delete" }] },
    { code: `const list = []; list.push(1);`, errors: [{ messageId: "method" }] },
    { code: `[...items].sort(compare);`, errors: [{ messageId: "method" }] },
    { code: `cache.set(key, value); seen.add(key); seen.delete(key); seen.clear();`, errors: 4 },
    { code: `items["reverse"]();`, errors: [{ messageId: "method" }] },
  ],
});
