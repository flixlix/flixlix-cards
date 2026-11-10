import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  energyCollection,
  fakeHass,
  sensor,
  type StatisticsFixture,
} from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import NumberFlow from "number-flow";
import { HomeFlowCard } from "./home-flow-card";
import { type HomeFlowCardConfig } from "./types";

const card: Partial<HomeFlowCardConfig> = {
  solar: { entity: "sensor.solar_power", name: "Roof" },
  battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
  grid: { entity: "sensor.grid_power" },
  energy_entities: {
    solar: "sensor.solar_energy",
    grid: { consumption: "sensor.grid_import", production: "sensor.grid_export" },
  },
};

const states = {
  "sensor.solar_power": "800",
  "sensor.battery_power": "0",
  "sensor.grid_power": "200",
  "sensor.battery_soc": sensor("40", { unit: "%" }),
};

const isToday = ({ start }: { start: Date }) => start.getDate() === new Date().getDate();

const statistics: StatisticsFixture = (window) =>
  isToday(window)
    ? { "sensor.solar_energy": 3000, "sensor.grid_import": 1200, "sensor.grid_export": 0 }
    : { "sensor.solar_energy": 5000, "sensor.grid_import": 400, "sensor.grid_export": 0 };

const mount = (options: Partial<HomeFlowCardConfig> = {}) =>
  mountCard(
    HomeFlowCard,
    { type: "custom:home-flow-card", ...card, ...options },
    fakeHass({
      states,
      statistics,
      energyCollection: energyCollection(new Date(2020, 0, 1), new Date(2020, 0, 1, 23, 59)),
    })
  );

const reading = (root: ShadowRoot, node: string) => {
  const label = root.querySelector(`.label.${node}`);
  const number = label?.querySelector(".number");
  const value = number instanceof NumberFlow ? String(number.value) : number?.textContent?.trim();
  return `${value ?? "—"} ${label?.querySelector(".unit")?.textContent ?? ""}`.trim();
};

const segment = (root: ShadowRoot, name: string) => {
  const button = [...root.querySelectorAll<HTMLButtonElement>(".views button")].find(
    (candidate) => candidate.textContent?.trim() === name
  );
  if (!button) {
    throw new Error(`no ${name} segment`);
  }
  return button;
};

const selected = (root: ShadowRoot) =>
  root.querySelector('.views [aria-checked="true"]')?.textContent?.trim();

describe("view selector", () => {
  test("switches between live power and the energy of the day so far", async () => {
    const { root, settle } = await mount();
    expect(selected(root)).toBe("Live");
    expect(reading(root, "solar")).toBe("800 W");

    await userEvent.click(segment(root, "Today"));
    await settle();
    expect(reading(root, "solar")).toBe("3 kWh");
    expect(root.querySelector(".label.solar")?.textContent).toContain("Roof");

    await userEvent.click(segment(root, "Live"));
    await settle();
    expect(reading(root, "solar")).toBe("800 W");
  });

  test("reads its own period, not the dashboard's date picker", async () => {
    const { root, settle } = await mount({ periods: ["today", "yesterday"] });

    await userEvent.click(segment(root, "Yesterday"));
    await settle();
    expect(reading(root, "solar")).toBe("5 kWh");

    await userEvent.click(segment(root, "Today"));
    await settle();
    expect(reading(root, "solar")).toBe("3 kWh");
  });

  test("with mode: energy, opens on the first period", async () => {
    const { root } = await mount({ mode: "energy", periods: ["yesterday", "today"] });

    expect(selected(root)).toBe("Yesterday");
    expect(reading(root, "solar")).toBe("5 kWh");
  });

  test("a node without an energy sensor is left out of the periods", async () => {
    const { root, settle } = await mount();
    expect(root.querySelector(".label.battery")).not.toBeNull();

    await userEvent.click(segment(root, "Today"));
    await settle();
    expect(root.querySelector(".label.battery")).toBeNull();
  });

  test("arrow keys move the selection and the focus with it", async () => {
    const { root, settle } = await mount({ periods: ["today", "week"] });
    segment(root, "Live").focus();

    await userEvent.keyboard("{ArrowRight}");
    await settle();
    expect(selected(root)).toBe("Today");
    expect(root.activeElement).toBe(segment(root, "Today"));

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await settle();
    expect(selected(root)).toBe("Week");
  });

  test.each([300, 360, 500, 800])("keeps clear of the labels on a %ipx card", async (width) => {
    const { root, settle } = await mountCard(
      HomeFlowCard,
      {
        type: "custom:home-flow-card",
        ...card,
        energy_entities: {
          ...card.energy_entities,
          battery: { consumption: "sensor.battery_out", production: "sensor.battery_in" },
        },
      },
      fakeHass({
        states,
        statistics: {
          "sensor.solar_energy": 12700,
          "sensor.grid_import": 7700,
          "sensor.grid_export": 2400,
          "sensor.battery_out": 3800,
          "sensor.battery_in": 4600,
        },
      }),
      { width }
    );
    const overlaps = () => {
      const selector = root.querySelector(".views")?.getBoundingClientRect();
      return [...root.querySelectorAll(".label")].flatMap((label) => {
        const box = label.getBoundingClientRect();
        return selector &&
          box.left < selector.right &&
          selector.left < box.right &&
          box.top < selector.bottom &&
          selector.top < box.bottom
          ? [label.className]
          : [];
      });
    };
    expect(overlaps()).toEqual([]);

    await userEvent.click(segment(root, "Today"));
    await settle();
    expect(overlaps()).toEqual([]);
  });

  test("the card and the house keep their size from one view to the next", async () => {
    const { root, settle } = await mountCard(
      HomeFlowCard,
      {
        type: "custom:home-flow-card",
        ...card,
        grid: { entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" } },
        car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" },
        heat_pump: { entity: "sensor.heat_pump_power" },
        energy_entities: {
          ...card.energy_entities,
          battery: { consumption: "sensor.battery_out", production: "sensor.battery_in" },
          heat_pump: "sensor.heat_pump_energy",
        },
      },
      fakeHass({
        states: {
          ...states,
          "sensor.grid_in": "200",
          "sensor.grid_out": "0",
          "sensor.car_power": "1500",
          "sensor.car_soc": sensor("60", { unit: "%" }),
          "sensor.heat_pump_power": "600",
        },
        statistics: {
          "sensor.solar_energy": 12700,
          "sensor.grid_import": 7700,
          "sensor.grid_export": 2400,
          "sensor.battery_out": 3800,
          "sensor.battery_in": 4600,
          "sensor.heat_pump_energy": 2100,
        },
      }),
      { width: 400 }
    );
    const size = () => {
      const haCard = root.querySelector("ha-card")?.getBoundingClientRect();
      const house = root.querySelector(".node.home")?.getBoundingClientRect();
      return {
        card: Math.round(haCard?.height ?? 0),
        house: [Math.round(house?.width ?? 0), Math.round(house?.height ?? 0)],
      };
    };
    const live = size();

    await userEvent.click(segment(root, "Today"));
    await settle();
    expect(root.querySelector(".label.grid")?.textContent).toContain("·");
    expect(size()).toEqual(live);
  });

  test("without energy_entities, the card shows no selector", async () => {
    const { energy_entities: _energy, ...live } = card;
    const { root } = await mountCard(
      HomeFlowCard,
      { type: "custom:home-flow-card", ...live },
      fakeHass({ states })
    );

    expect(root.querySelector(".views")).toBeNull();
  });
});
