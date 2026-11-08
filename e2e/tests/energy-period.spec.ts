import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { DAILY_KWH } from "../src/energy-history.ts";
import { cardByTitle, expect, openDashboard, test } from "../src/fixtures.ts";

const kWh = (value: number) => new RegExp(`^\\s*${value}\\s*kWh\\s*$`);

test("switching the period in energy-date-selection shows that period's imported statistics", async ({
  page,
}) => {
  test.skip(
    new Date().getUTCHours() === 0,
    "During the first UTC hour of the day the energy cards default to yesterday"
  );
  await openDashboard(page, CARD_DASHBOARDS["energy-flow-card-plus"]);
  const flow = cardByTitle(page, "energy-flow-card-plus", "Energy flow");
  const gridImport = flow.locator(".circle-container.grid .consumption");
  const solar = flow.locator(".circle-container.solar span.solar");
  const ev = cardByTitle(page, "energy-breakdown-card", "Devices")
    .locator(".legend-item")
    .filter({ hasText: "EV" })
    .locator(".legend-amount");

  const { today, yesterday } = DAILY_KWH;
  await expect(gridImport).toHaveText(kWh(today["sensor.grid_import_energy"]));
  await expect(solar).toHaveText(kWh(today["sensor.solar_energy"]));
  await expect(ev).toHaveText(kWh(today["sensor.ev_charger_energy"]));

  await page
    .locator("hui-energy-period-selector")
    .getByRole("button", { name: /previous/i })
    .click();

  await expect(gridImport).toHaveText(kWh(yesterday["sensor.grid_import_energy"]));
  await expect(solar).toHaveText(kWh(yesterday["sensor.solar_energy"]));
  await expect(ev).toHaveText(kWh(yesterday["sensor.ev_charger_energy"]));
});

test("energy-period-selector-plus drives HA's own energy collection", async ({ page }) => {
  test.skip(
    new Date().getUTCHours() === 0,
    "During the first UTC hour of the day the energy cards default to yesterday"
  );
  await openDashboard(page, CARD_DASHBOARDS["energy-flow-card-plus"]);
  const selector = page.locator("energy-period-selector-plus");
  const gridImport = cardByTitle(page, "energy-flow-card-plus", "Energy flow").locator(
    ".circle-container.grid .consumption"
  );
  const { today, yesterday } = DAILY_KWH;
  await expect(gridImport).toHaveText(kWh(today["sensor.grid_import_energy"]));

  await selector.getByRole("button", { name: "Previous" }).click();
  await expect(gridImport).toHaveText(kWh(yesterday["sensor.grid_import_energy"]));

  await selector.getByRole("button", { name: "Month" }).click();
  await expect(selector.getByRole("button", { name: "Month" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  const haTitle = page.locator("hui-energy-period-selector .header-title");
  await expect
    .poll(async () =>
      (await selector.locator(".label").innerText()).includes(await haTitle.innerText())
    )
    .toBe(true);
});
