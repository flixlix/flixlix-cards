import { parse } from "acorn";
import { rollup } from "rollup";
import { expect, it } from "vite-plus/test";
import { createCardConfig } from "./index.js";

async function buildCard(input) {
  const config = createCardConfig({ input, outDir: "dist", watch: false });
  const bundle = await rollup(config);
  const { output } = await bundle.generate(config.output);
  await bundle.close();
  return output[0].code;
}

it("emits a bundle that Chrome 67 (Chromecast, Nest Hub) can parse", async () => {
  const code = await buildCard("fixtures/modern-syntax.ts");

  expect(() => parse(code, { ecmaVersion: 2019, sourceType: "module" })).not.toThrow();
}, 30_000);

it("stamps the build id into the card bundle", async () => {
  const code = await buildCard("fixtures/build-id.ts");

  expect(code).toMatch(/[0-9a-f]{7,}(\+dirty)? · built \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
  expect(code).not.toContain("__FLIXLIX_BUILD__");
}, 30_000);
