import { parse } from "acorn";
import { build } from "vite-plus";
import { expect, it } from "vite-plus/test";
import { createCardConfig } from "./index.js";

async function buildCard(entry) {
  const config = createCardConfig({ entry, name: "card" });
  const result = await build({
    ...config,
    configFile: false,
    logLevel: "silent",
    build: { ...config.build, write: false },
  });
  const [{ output }] = Array.isArray(result) ? result : [result];
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

it("leaves the build id out of release bundles", async () => {
  globalThis.process.env.RELEASE_BUILD = "true";
  try {
    const code = await buildCard("fixtures/build-id.ts");

    expect(code).not.toMatch(/built \d{4}-\d{2}-\d{2}/);
    expect(code).not.toContain("__FLIXLIX_BUILD__");
  } finally {
    delete globalThis.process.env.RELEASE_BUILD;
  }
}, 30_000);

it("keeps code that only runs in a browser", async () => {
  const code = await buildCard("fixtures/browser-only.ts");

  expect(code).toContain("browser-only code kept");
}, 30_000);
