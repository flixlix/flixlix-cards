import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { bundleReport } from "./report.js";

const [cardsDirectory = "packages/flixlix-cards", outputDirectory = ".", baselinePath] =
  process.argv.slice(2);

/** @param {string} name */
function measure(name) {
  const file = join(cardsDirectory, name, "dist", `${name}.js`);
  if (!existsSync(file)) {
    throw new Error(`${file} is missing: build the cards before measuring them.`);
  }
  const code = readFileSync(file);
  return { name, minified: code.length, gzip: gzipSync(code, { level: 9 }).length };
}

const sizes = readdirSync(cardsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => measure(entry.name));
const budgets = JSON.parse(readFileSync(new URL("budgets.json", import.meta.url), "utf8"));
const baseline =
  baselinePath && existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : undefined;

const { markdown, overBudget } = bundleReport({ sizes, budgets, baseline });
writeFileSync(join(outputDirectory, "bundle-sizes.json"), `${JSON.stringify(sizes, null, 2)}\n`);
writeFileSync(join(outputDirectory, "bundle-size.md"), markdown);
process.stdout.write(markdown);

if (overBudget.length > 0) {
  process.exitCode = 1;
}
