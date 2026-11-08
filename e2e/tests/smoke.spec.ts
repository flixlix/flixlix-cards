import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { expect, openDashboard, runScript, test } from "../src/fixtures.ts";

/** How many of each custom card the YAML dashboards in `.hass_dev/dashboards/` contain. */
const expectedCards: Record<string, Record<string, number>> = {
  [CARD_DASHBOARDS["power-flow-card-plus"]]: { "power-flow-card-plus": 8 },
  [CARD_DASHBOARDS["energy-flow-card-plus"]]: {
    "energy-flow-card-plus": 1,
    "energy-breakdown-card": 1,
    "energy-period-selector-plus": 1,
  },
  [CARD_DASHBOARDS["energy-breakdown-card"]]: { "energy-breakdown-card": 3 },
  [CARD_DASHBOARDS["sortable-list-card"]]: { "sortable-list-card": 2 },
};

test.beforeAll(async () => {
  await runScript("scenario_default");
});

for (const [dashboard, cards] of Object.entries(expectedCards)) {
  test(`${dashboard} dashboard loads its card resources and renders every card`, async ({
    page,
  }) => {
    await openDashboard(page, dashboard);
    await Promise.all(
      Object.entries(cards).map(async ([tag, count]) => {
        await expect(page.locator(`${tag} ha-card`)).toHaveCount(count);
        expect(await page.evaluate((name) => !!customElements.get(name), tag)).toBe(true);
      })
    );
    await expect(page.locator("hui-error-card")).toHaveCount(0);
  });
}
