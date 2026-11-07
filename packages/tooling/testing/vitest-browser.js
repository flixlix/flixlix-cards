import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

/**
 * Cards mounted in real Chromium. `dom` asserts on the DOM and runs everywhere; `visual` compares
 * screenshots and only runs inside the pinned Playwright image (`pnpm test:visual`), because fonts
 * differ per OS.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
      instances: [{ browser: "chromium" }],
      viewport: { width: 500, height: 700 },
      screenshotFailures: false,
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { threshold: 0.1, allowedMismatchedPixelRatio: 0.002 },
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.browser.test.ts"],
          exclude: ["src/**/*.visual.browser.test.ts"],
        },
      },
      {
        extends: true,
        test: { name: "visual", include: ["src/**/*.visual.browser.test.ts"] },
      },
    ],
  },
});
