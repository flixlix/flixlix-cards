import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { callService, type JsonObject, readToken } from "./hass.ts";

type Fixtures = {
  /** Console errors and uncaught exceptions of the page; checked after every test. */
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Calls `script.<name>`; Home Assistant answers once the script has finished. */
export async function runScript(name: string, data: JsonObject = {}): Promise<void> {
  await callService(await readToken(), "script", name, data);
}

export async function callHassService(domain: string, service: string, data: JsonObject) {
  await callService(await readToken(), domain, service, data);
}

/** A card on the page by its custom element and the title in its header. */
export const cardByTitle = (page: Page, tag: string, title: string): Locator =>
  page.locator(tag).filter({ hasText: title });

/** Opens a dashboard view and waits until Home Assistant has rendered it. */
export async function openDashboard(page: Page, path: string): Promise<void> {
  await page.goto(`/${path}`);
  await expect(
    page.locator("hui-view, hui-sections-view, hui-masonry-view").first()
  ).toBeAttached();
}
