/** @param {number} bytes */
const kilobytes = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

/** @param {number} current @param {number | undefined} previous */
function change(current, previous) {
  if (previous === undefined) {
    return "new";
  }
  const difference = current - previous;
  if (difference === 0) {
    return "0";
  }
  const sign = difference > 0 ? "+" : "-";
  const percent =
    previous === 0 ? "" : ` (${sign}${Math.abs((difference / previous) * 100).toFixed(1)}%)`;
  return `${sign}${kilobytes(Math.abs(difference))}${percent}`;
}

/**
 * @typedef {{ name: string; minified: number; gzip: number }} BundleSize
 * @param {{
 *   sizes: BundleSize[];
 *   budgets: Record<string, number>;
 *   baseline?: BundleSize[];
 *   baselineLabel?: string;
 * }} input
 *   `budgets` caps each card's gzip size in bytes; `baseline` is the last measurement on main.
 */
export function bundleReport({ sizes, budgets, baseline, baselineLabel = "main" }) {
  const previous = new Map((baseline ?? []).map((size) => [size.name, size.gzip]));
  const overBudget = [];
  const rows = sizes.map(({ name, minified, gzip }) => {
    const budget = budgets[name];
    const fits = budget !== undefined && gzip <= budget;
    if (!fits) {
      overBudget.push(name);
    }
    const delta = baseline ? ` | ${change(gzip, previous.get(name))}` : "";
    const limit = budget === undefined ? "no budget" : kilobytes(budget);
    return `| ${fits ? "✅" : "❌"} | \`${name}\` | ${kilobytes(minified)} | ${kilobytes(gzip)}${delta} | ${limit} |`;
  });

  const deltaHeader = baseline ? ` | Δ gzip vs ${baselineLabel}` : "";
  const deltaRule = baseline ? " | ---:" : "";
  const verdict =
    overBudget.length === 0
      ? "All cards are within their gzip budget."
      : `Over budget: ${overBudget.map((name) => `\`${name}\``).join(", ")}. Shrink the bundle, or raise its budget in \`packages/tooling/bundle-size/budgets.json\` and say why in the PR.`;

  const markdown = [
    "### Bundle size",
    "",
    `|  | Card | Minified | Gzip${deltaHeader} | Budget (gzip) |`,
    `| :-: | --- | ---: | ---:${deltaRule} | ---: |`,
    ...rows,
    "",
    verdict,
    ...(baseline ? [] : ["", `_No ${baselineLabel} measurement cached yet, so no deltas._`]),
    "",
  ].join("\n");

  return { markdown, overBudget };
}
