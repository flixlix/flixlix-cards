import { expect, it } from "vite-plus/test";
import { bundleReport } from "./report.js";

const card = { name: "home-flow-card", minified: 300_000, gzip: 90_000 };

it("passes a card within its budget", () => {
  const { markdown, overBudget } = bundleReport({
    sizes: [card],
    budgets: { "home-flow-card": 90_000 },
  });

  expect(overBudget).toEqual([]);
  expect(markdown).toContain("| ✅ | `home-flow-card` | 300.0 kB | 90.0 kB | 90.0 kB |");
});

it("fails a card over its budget and one without a budget", () => {
  const { markdown, overBudget } = bundleReport({
    sizes: [card, { name: "new-card", minified: 1000, gzip: 500 }],
    budgets: { "home-flow-card": 89_999 },
  });

  expect(overBudget).toEqual(["home-flow-card", "new-card"]);
  expect(markdown).toContain("| ❌ | `home-flow-card` |");
  expect(markdown).toContain("| ❌ | `new-card` | 1.0 kB | 0.5 kB | no budget |");
});

it("shows the gzip change against main", () => {
  const { markdown } = bundleReport({
    sizes: [card, { name: "sortable-list-card", minified: 40_000, gzip: 14_000 }],
    budgets: { "home-flow-card": 100_000, "sortable-list-card": 15_000 },
    baseline: [
      { name: "home-flow-card", minified: 290_000, gzip: 88_000 },
      { name: "sortable-list-card", minified: 40_000, gzip: 14_000 },
    ],
  });

  expect(markdown).toContain("| 90.0 kB | +2.0 kB (+2.3%) | 100.0 kB |");
  expect(markdown).toContain("| 14.0 kB | 0 | 15.0 kB |");
});

it("marks a card main has not measured as new", () => {
  const { markdown } = bundleReport({
    sizes: [card],
    budgets: { "home-flow-card": 100_000 },
    baseline: [],
  });

  expect(markdown).toContain("| 90.0 kB | new |");
});
