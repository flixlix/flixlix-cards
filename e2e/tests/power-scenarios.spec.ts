import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { cardByTitle, expect, openDashboard, runScript, test } from "../src/fixtures.ts";

// A smoke pass that real sensor states reach the card; the full scenario matrix is covered by
// the deterministic browser tests with a fake hass.

const watts = (value: string) => new RegExp(`^\\s*${value}\\s*$`);

test.afterAll(async () => {
  await runScript("scenario_default");
});

test("solver regression scenario: split readings balance to 50 W at home", async ({ page }) => {
  await runScript("scenario_solver_regression");
  await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
  const card = cardByTitle(page, "power-flow-card-plus", "Split entities");

  await expect(card.locator(".circle-container.grid .consumption")).toHaveText(watts("200\\s*W"));
  await expect(card.locator(".circle-container.grid .return")).toHaveText(watts("600\\s*W"));
  await expect(card.locator(".circle-container.solar span.solar")).toHaveText(watts("500\\s*W"));
  await expect(card.locator(".battery-in")).toHaveText(watts("200\\s*W"));
  await expect(card.locator(".battery-out")).toHaveText(watts("150\\s*W"));
  await expect(card.locator("#home-circle")).toContainText(/50\s*W/);
});

test("grid outage scenario: the grid shows the generator", async ({ page }) => {
  await runScript("scenario_grid_outage_generator");
  await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
  const card = cardByTitle(page, "power-flow-card-plus", "Power outage with generator");

  await expect(card.locator(".circle-container.grid .consumption")).toHaveText(watts("1.5\\s*kW"));
  await expect(card.locator(".circle-container.grid .return")).toHaveCount(0);
});
