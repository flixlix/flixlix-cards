import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { fakeHass, sensor, type StateFixtures } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { HomeFlowCard } from "./home-flow-card";

const nodes = {
  solar: { entity: "sensor.solar" },
  battery: { entity: "sensor.battery", state_of_charge: "sensor.battery_soc" },
  grid: { entity: "sensor.grid" },
};

const mountHouse = async (states: StateFixtures, config: object = {}) => {
  const { card } = await mountCard(
    HomeFlowCard,
    { type: "custom:home-flow-card", ...nodes, animate_numbers: false, ...config },
    fakeHass({ states })
  );
  return page.elementLocator(card);
};

test("an evening on the battery", async () => {
  const card = await mountHouse({
    "sensor.solar": "800",
    "sensor.battery": "1800",
    "sensor.grid": "0",
    "sensor.battery_soc": sensor("22", { unit: "%" }),
  });
  await expect.element(card).toMatchScreenshot("evening");
});

test("a sunny noon, charging and exporting", async () => {
  const card = await mountHouse({
    "sensor.solar": "6200",
    "sensor.battery": "-2500",
    "sensor.grid": "-2300",
    "sensor.battery_soc": sensor("55", { unit: "%" }),
  });
  await expect.element(card).toMatchScreenshot("noon");
});

test("grid and home only", async () => {
  const card = await mountHouse(
    { "sensor.grid": "800" },
    { grid: { entity: "sensor.grid" }, solar: undefined, battery: undefined }
  );
  await expect.element(card).toMatchScreenshot("grid-only");
});
