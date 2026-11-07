import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { cardByTitle, expect, openDashboard, test } from "../src/fixtures.ts";

test("tapping a node opens Home Assistant's more-info dialog for its entity", async ({ page }) => {
  await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
  const card = cardByTitle(page, "power-flow-card-plus", "Combined entities");

  await card.locator(".circle-container.solar .circle").click();

  const dialog = page.locator("ha-more-info-dialog");
  await expect(dialog.getByRole("dialog")).toBeVisible();
  await expect(dialog.getByText("Solar Power").first()).toBeVisible();
});
