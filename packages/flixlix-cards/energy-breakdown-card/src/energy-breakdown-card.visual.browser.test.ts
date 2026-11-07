import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { fakeHass, sensor } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyBreakdownCard } from "./energy-breakdown-card";

const hass = fakeHass({
  states: {
    "sensor.heat_pump": sensor("3", {
      unit: "kWh",
      name: "Heat pump",
      attributes: { icon: "mdi:heat-pump" },
    }),
    "sensor.ev": sensor("1.5", {
      unit: "kWh",
      name: "EV charger",
      attributes: { icon: "mdi:ev-station" },
    }),
    "sensor.oven": sensor("0.5", { unit: "kWh", name: "Oven", attributes: { icon: "mdi:stove" } }),
  },
});
const entities = [
  { entity: "sensor.heat_pump" },
  { entity: "sensor.ev" },
  { entity: "sensor.oven" },
];

test.for(["bar", "donut"])("%s chart", async (chartType) => {
  const { card } = await mountCard(
    EnergyBreakdownCard,
    { type: "custom:energy-breakdown-card", title: "Today", chart_type: chartType, entities },
    hass
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot(`${chartType}-chart`);
});
