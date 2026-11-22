import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { cardByTitle, expect, openDashboard, runScript, test } from "../src/fixtures.ts";

// #507: the sections grid sizes the card in rows, and the card fills that height.

test.beforeAll(async () => {
  await runScript("scenario_default");
});

/** Rows in a sections grid are 56px tall with 8px between them. */
const gridRowsHeight = (rows: number) => rows * 56 + (rows - 1) * 8;

test("a card set to ten rows fills them, spreading its rows of circles", async ({ page }) => {
  await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
  const card = cardByTitle(page, "power-flow-card-plus", "Ten rows tall");
  const reference = cardByTitle(page, "power-flow-card-plus", "Combined entities");
  const centreY = async (locator: typeof card) => {
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("element is not laid out");
    }
    return box.y + box.height / 2;
  };
  const pitch = async (locator: typeof card) =>
    (await centreY(locator.locator(".home .circle"))) -
    (await centreY(locator.locator(".solar .circle")));

  await expect(card.locator(".home .circle")).toBeVisible();
  expect((await card.locator("ha-card").boundingBox())?.height).toBeCloseTo(gridRowsHeight(10), 0);
  expect(await pitch(card)).toBeGreaterThan((await pitch(reference)) + 40);
});
