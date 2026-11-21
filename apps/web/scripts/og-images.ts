import { type Browser, chromium } from "playwright";

import { OG_IMAGE_SIZE, OG_IMAGES, type OgImage } from "../src/lib/og-images.ts";

const baseUrl = process.env.OG_BASE_URL ?? "http://localhost:3000";
const outDir = new URL("../public/og/", import.meta.url);

const SETTLE_MS = 2500;

async function renderImage(browser: Browser, image: OgImage) {
  const page = await browser.newPage({ viewport: OG_IMAGE_SIZE, colorScheme: "dark" });
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto(`${baseUrl}/og/${image}`);
  await page.addStyleTag({
    content: "body > :not([data-og-frame]) { display: none !important; }",
  });
  await page.locator("[data-card-preview] > *").first().waitFor();
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: new URL(`${image}.png`, outDir).pathname });
  await page.close();
}

const browser = await chromium.launch();
try {
  await Promise.all(OG_IMAGES.map((image) => renderImage(browser, image)));
} finally {
  await browser.close();
}
