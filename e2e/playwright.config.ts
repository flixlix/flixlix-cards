import { defineConfig, devices } from "@playwright/test";
import { HASS_URL } from "./src/hass.ts";
import { STORAGE_STATE } from "./src/global-setup.ts";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./src/global-setup.ts",
  // Every test drives the same Home Assistant, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: { timeout: 15_000 },
  use: {
    baseURL: HASS_URL,
    storageState: STORAGE_STATE,
    // The dev instance runs in UTC; the energy cards compute "today" in the browser's zone.
    timezoneId: "UTC",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1200 } },
    },
  ],
});
