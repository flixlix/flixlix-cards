import { type Locator } from "@playwright/test";
import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { cardByTitle, expect, openDashboard, runScript, test } from "../src/fixtures.ts";

const TAG = "home-flow-card";

/** Whether the car is drawn, and with its cable: hidden, idle (no cable) or active. */
const carStatus = async (card: Locator) => {
  if ((await card.locator("image.car").count()) === 0) {
    return "hidden";
  }
  return (await card.locator(".track.car").count()) === 0 ? "idle" : "active";
};

test.describe("the car's conditions", () => {
  const cards = [
    "Car: conditions as Home Assistant 2026.10 writes them",
    "Car: shown while home, idle while unplugged",
  ];

  for (const [script, status] of [
    ["car_charging", "active"],
    ["car_unplugged", "idle"],
    ["car_away", "hidden"],
  ] as const) {
    test(`after ${script}, the car is ${status} in either condition format`, async ({ page }) => {
      await runScript(script);
      await openDashboard(page, CARD_DASHBOARDS[TAG]);
      await Promise.all(
        cards.map(async (title) => {
          const card = cardByTitle(page, TAG, title);
          await expect(card.locator("svg").first()).toBeAttached();
          await expect.poll(() => carStatus(card), { message: title }).toBe(status);
        })
      );
    });
  }

  test("follow Home Assistant's verdict while the page is open", async ({ page }) => {
    await runScript("car_unplugged");
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, cards[0] ?? "");
    await expect.poll(() => carStatus(card)).toBe("idle");
    await runScript("car_charging");
    await expect.poll(() => carStatus(card)).toBe("active");
    await runScript("car_away");
    await expect.poll(() => carStatus(card)).toBe("hidden");
  });
});
