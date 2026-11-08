import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { energyCollection, fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyPeriodSelectorPlus } from "./energy-period-selector-plus";

const mountSelector = (config: object, start: Date, end: Date) =>
  mountCard(
    EnergyPeriodSelectorPlus,
    { type: "custom:energy-period-selector-plus", card_background: true, ...config },
    fakeHass({ energyCollection: energyCollection(start, end) })
  );

test("month selected, with title, today and compare buttons", async () => {
  const { card } = await mountSelector(
    { title: "Energy period", compare_button_type: "icon" },
    new Date(2026, 0, 1),
    new Date(2026, 0, 31, 23, 59, 59, 999)
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot("month");
});

test("custom range with date inputs", async () => {
  const { card } = await mountSelector(
    { period_buttons: ["day", "week", "month", "year", "custom"], compare_button_type: "text" },
    new Date(2026, 0, 10),
    new Date(2026, 1, 8, 23, 59, 59, 999)
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot("custom-range");
});
