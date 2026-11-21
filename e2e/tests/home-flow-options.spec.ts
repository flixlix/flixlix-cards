import { type Locator } from "@playwright/test";
import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { DAILY_KWH } from "../src/energy-history.ts";
import { cardByTitle, expect, openDashboard, runScript, test } from "../src/fixtures.ts";

const TAG = "home-flow-card";

const kWh = (value: number) => `${value} kWh`;

/** A label's value line as it reads: each number with its unit, in order. */
const valueLine = (card: Locator, node: string) =>
  card.locator(`.label.${node} .value > .number`).evaluateAll((numbers) =>
    numbers
      .map((number) => {
        const value = "value" in number ? String(number.value) : number.textContent?.trim();
        const unit = number.nextElementSibling?.classList.contains("unit")
          ? ` ${number.nextElementSibling.getAttribute("data-word")}`
          : "";
        return `${value}${unit}`;
      })
      .join(" · ")
  );

/** The animation and dash of a node's pulse, which follow its wire's flow rate and intensity. */
const pulseStyle = (card: Locator, node: string) =>
  card.locator(`.power.${node} .pulse`).first().getAttribute("style");

const fontSize = (card: Locator, node: string) =>
  card
    .locator(`.label.${node} .value`)
    .evaluate((value) => Number.parseFloat(getComputedStyle(value).fontSize));

test.describe("live, the older option names read as the generic ones", () => {
  test.beforeAll(async () => {
    await runScript("scenario_default");
  });

  test("after_power and expected power show and pulse as after_value and expected value", async ({
    page,
  }) => {
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const older = cardByTitle(page, TAG, "Older names: after_power, expected power");
    const generic = cardByTitle(page, TAG, "Generic names: after_value, expected value");
    await expect(generic.locator(".label.battery .value")).toContainText("%");

    const defaultRange = cardByTitle(page, TAG, "After the value");
    expect(await valueLine(older, "battery")).toBe(await valueLine(generic, "battery"));
    expect(await valueLine(defaultRange, "battery")).toBe(await valueLine(generic, "battery"));
    const nodes = ["solar", "battery", "grid"];
    const pulses = (card: Locator) => Promise.all(nodes.map((node) => pulseStyle(card, node)));
    expect(await pulses(older)).toEqual(await pulses(generic));
    expect(await pulses(defaultRange)).not.toEqual(await pulses(generic));
  });
});

test.describe("energy mode with the generic options", () => {
  test.skip(
    new Date().getUTCHours() === 0,
    "During the first UTC hour of the day the energy cards default to yesterday"
  );

  test("shows each period's totals, a value each way at two_way_value_size", async ({ page }) => {
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const card = cardByTitle(page, TAG, "Energy over the period");
    const { today, yesterday } = DAILY_KWH;

    await expect.poll(() => valueLine(card, "solar")).toBe(kWh(today["sensor.solar_energy"]));
    expect(await valueLine(card, "grid")).toBe(
      `${kWh(today["sensor.grid_import_energy"])} · ${kWh(today["sensor.grid_export_energy"])}`
    );
    expect(await valueLine(card, "car")).toBe(kWh(today["sensor.ev_charger_energy"]));
    expect(await fontSize(card, "grid")).toBeCloseTo((await fontSize(card, "solar")) * 0.8, 1);

    await page
      .locator("hui-energy-period-selector")
      .getByRole("button", { name: /previous/i })
      .click();

    await expect.poll(() => valueLine(card, "solar")).toBe(kWh(yesterday["sensor.solar_energy"]));
    expect(await valueLine(card, "grid")).toBe(
      `${kWh(yesterday["sensor.grid_import_energy"])} · ${kWh(yesterday["sensor.grid_export_energy"])}`
    );
  });

  test("an expected range in Wh sets the pulses, the older one in W does not", async ({ page }) => {
    await openDashboard(page, CARD_DASHBOARDS[TAG]);
    const generic = cardByTitle(page, TAG, "Energy over the period");
    const older = cardByTitle(page, TAG, "Energy, older names: a range in W does not apply");
    const solar = DAILY_KWH.today["sensor.solar_energy"];
    await expect.poll(() => valueLine(generic, "solar")).toBe(kWh(solar));
    await expect.poll(() => valueLine(older, "solar")).toBe(kWh(solar));

    expect(await pulseStyle(older, "solar")).not.toBe(await pulseStyle(generic, "solar"));
    expect(await valueLine(older, "battery")).toBe(await valueLine(generic, "battery"));
  });
});
