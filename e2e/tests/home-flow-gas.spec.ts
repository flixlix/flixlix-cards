import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { DAILY_KWH } from "../src/energy-history.ts";
import {
  cardByTitle,
  expect,
  houseValueLine,
  openDashboard,
  runScript,
  test,
} from "../src/fixtures.ts";

const TAG = "home-flow-card";
const today = DAILY_KWH.today["sensor.gas_meter"];
const yesterday = DAILY_KWH.yesterday["sensor.gas_meter"];

test.describe("live gas", () => {
  test.afterAll(async () => {
    await runScript("gas_burning");
  });

  test("flows in from the street while the boiler burns, in the sensor's own unit", async ({
    page,
  }) => {
    await runScript("gas_burning");
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, "Gas: live, in from the street");

    await expect.poll(() => houseValueLine(card, "gas")).toBe("0.42 m³/h");
    await expect(card.locator(".label.gas .name")).toHaveText("Gas");
    await expect(card.locator(".node.gas")).toBeAttached();
    await expect(card.locator(".power.gas .pulse")).toBeAttached();

    await runScript("gas_off");

    await expect.poll(() => houseValueLine(card, "gas")).toBe("0 m³/h");
    await expect(card.locator(".power.gas")).toHaveCount(0);
    await expect(card.locator(".track.gas")).toBeAttached();
  });

  test("tapping its label opens the gas sensor's more-info dialog", async ({ page }) => {
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, "Gas: live, in from the street");

    await card.locator(".label.gas").click();

    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog.getByRole("dialog")).toBeVisible();
    await expect(dialog.getByText("Gas Flow").first()).toBeVisible();
  });
});

test.describe("gas over a period", () => {
  test.skip(
    new Date().getUTCHours() === 0,
    "During the first UTC hour of the day the energy cards default to yesterday"
  );

  test("the views switch between the flow now and what the meter counted today", async ({
    page,
  }) => {
    await runScript("gas_burning");
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, "Gas: live or today");
    await expect.poll(() => houseValueLine(card, "gas")).toBe("0.42 m³/h");
    await expect(card.locator(".label.gas .name")).toHaveText("Boiler");

    await card.getByRole("radio", { name: "Today" }).click();

    await expect.poll(() => houseValueLine(card, "gas")).toBe(`${today} m³`);

    await card.getByRole("radio", { name: "Live" }).click();

    await expect.poll(() => houseValueLine(card, "gas")).toBe("0.42 m³/h");
  });

  test("an energy card follows the dashboard's period", async ({ page }) => {
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, "Gas over the period, beside a heat pump");

    await expect.poll(() => houseValueLine(card, "gas")).toBe(`${today} m³`);
    expect(await houseValueLine(card, "heat_pump")).toBe(
      `${DAILY_KWH.today["sensor.heat_pump_energy"]} kWh`
    );

    await page
      .locator("hui-energy-period-selector")
      .getByRole("button", { name: /previous/i })
      .click();

    await expect.poll(() => houseValueLine(card, "gas")).toBe(`${yesterday} m³`);
  });
});
