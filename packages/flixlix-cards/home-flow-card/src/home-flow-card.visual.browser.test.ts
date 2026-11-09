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

const mountHouse = async (states: StateFixtures, config: object = {}, width?: number) => {
  const { card } = await mountCard(
    HomeFlowCard,
    { type: "custom:home-flow-card", ...nodes, animate_numbers: false, ...config },
    fakeHass({ states }),
    { width }
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

test("a car charging off the sun", async () => {
  const card = await mountHouse(
    {
      "sensor.solar": "9000",
      "sensor.battery": "0",
      "sensor.grid": "-200",
      "sensor.battery_soc": sensor("80", { unit: "%" }),
      "sensor.car_power": sensor("7.4", { unit: "kW" }),
      "sensor.car_soc": sensor("64", { unit: "%" }),
    },
    { car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" } }
  );
  await expect.element(card).toMatchScreenshot("car");
});

test("an idle car, parked and unplugged", async () => {
  const card = await mountHouse(
    {
      "sensor.solar": "3200",
      "sensor.battery": "-1800",
      "sensor.grid": "0",
      "sensor.battery_soc": sensor("62", { unit: "%" }),
      "sensor.car_power": "0",
      "sensor.car_soc": sensor("80", { unit: "%" }),
    },
    { car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" } }
  );
  await expect.element(card).toMatchScreenshot("car-idle");
});

const heatPumpHeating: StateFixtures = {
  "sensor.heat_pump_power": "1350",
  "climate.heat_pump": sensor("heat", {
    unit: undefined,
    attributes: { hvac_action: "heating", current_temperature: 38, temperature: 45 },
  }),
};

const heatPump = { entity: "sensor.heat_pump_power", climate: "climate.heat_pump" };

test("a heat pump heating, low on the wall without a car", async () => {
  const card = await mountHouse(
    {
      "sensor.solar": "1900",
      "sensor.battery": "400",
      "sensor.grid": "620",
      "sensor.battery_soc": sensor("64", { unit: "%" }),
      ...heatPumpHeating,
    },
    { heat_pump: heatPump }
  );
  await expect.element(card).toMatchScreenshot("heat-pump");
});

test("a heat pump above a charging car, with its temperature and target", async () => {
  const card = await mountHouse(
    {
      "sensor.solar": "9000",
      "sensor.battery": "0",
      "sensor.grid": "-200",
      "sensor.battery_soc": sensor("80", { unit: "%" }),
      "sensor.car_power": sensor("7.4", { unit: "kW" }),
      "sensor.car_soc": sensor("64", { unit: "%" }),
      ...heatPumpHeating,
    },
    {
      car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" },
      heat_pump: { ...heatPump, status: "temperature_and_target" },
    }
  );
  await expect.element(card).toMatchScreenshot("heat-pump-car");
});

const charging: StateFixtures = {
  "sensor.solar": "9000",
  "sensor.battery": "0",
  "sensor.grid": "-200",
  "sensor.battery_soc": sensor("80", { unit: "%" }),
  "sensor.car_power": sensor("7.4", { unit: "kW" }),
  "sensor.car_soc": sensor("64", { unit: "%" }),
};

test("a narrow card keeps its labels readable", async () => {
  const card = await mountHouse(
    charging,
    { car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" } },
    330
  );
  await expect.element(card).toMatchScreenshot("narrow");
});

test("a wide card gives the house the room its labels stop taking", async () => {
  // the shared viewport is 500 px wide, too narrow for the card
  await page.viewport(1340, 1400);
  try {
    const card = await mountHouse(
      charging,
      { car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" } },
      1300
    );
    await expect.element(card).toMatchScreenshot("wide");
  } finally {
    await page.viewport(500, 700);
  }
});
