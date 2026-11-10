import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  energyCollection,
  fakeHass,
  sensor,
  type StateFixtures,
  withStates,
} from "@flixlix-cards/shared/testing/fake-hass";
import { dotLoop } from "@flixlix-cards/shared/testing/dot-loop";
import { expectFlowCard } from "@flixlix-cards/shared/testing/expect-flow-card";
import { asEnergyUnits, flowScenarios } from "@flixlix-cards/shared/testing/flow-scenarios";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyFlowCardPlus } from "./energy-flow-card-plus";

/** The scenario's power numbers as Wh growth per statistic. */
const growthOf = (states: StateFixtures) =>
  Object.fromEntries(
    Object.entries(states).map(([id, state]) => [
      id,
      Number(typeof state === "string" ? state : state.state),
    ])
  );

const day = (date: number) => ({
  start: new Date(2026, 0, date, 0, 0, 0),
  end: new Date(2026, 0, date, 23, 59, 59),
});

describe("energy flow card scenarios", () => {
  test.for(flowScenarios.filter((scenario) => scenario.energy))("$name", async (scenario) => {
    const card = await mountCard(
      EnergyFlowCardPlus,
      { type: "custom:energy-flow-card-plus", ...scenario.options, entities: scenario.entities },
      fakeHass({
        states: scenario.states,
        statistics: growthOf(scenario.states),
        energyCollection: energyCollection(day(1).start, day(1).end),
      }),
      { width: scenario.width }
    );
    expectFlowCard(card, scenario.expect, asEnergyUnits);
  });
});

describe("energy period", () => {
  const entities = {
    grid: { entity: { consumption: "sensor.grid_import", production: "sensor.grid_export" } },
    solar: { entity: "sensor.solar" },
  };

  test("shows loading until the period's statistics arrive, then the values", async () => {
    let deliver: ((growth: Record<string, number>) => void) | undefined;
    const statistics = new Promise<Record<string, number>>((resolve) => {
      deliver = resolve;
    });
    const card = await mountCard(
      EnergyFlowCardPlus,
      { type: "custom:energy-flow-card-plus", entities },
      fakeHass({
        statistics: () => statistics,
        energyCollection: energyCollection(day(1).start, day(1).end),
      })
    );
    expect(card.text(".card-content")).toBe("Loading…");

    deliver?.({ "sensor.grid_import": 1200, "sensor.grid_export": 0, "sensor.solar": 3000 });
    await card.settle();
    expect(card.text(".grid .consumption")).toBe("1.2 kWh");
    expect(card.text("#home-circle")).toBe("4.2 kWh");
  });

  test("changing the dashboard's period refetches and shows that period", async () => {
    const growthByDay: Record<number, Record<string, number>> = {
      1: { "sensor.grid_import": 1000, "sensor.grid_export": 0, "sensor.solar": 0 },
      2: { "sensor.grid_import": 0, "sensor.grid_export": 500, "sensor.solar": 2500 },
    };
    const collection = energyCollection(day(1).start, day(1).end);
    const hass = fakeHass({
      statistics: (window) => growthByDay[window.start.getDate()] ?? {},
      energyCollection: collection,
    });
    const card = await mountCard(
      EnergyFlowCardPlus,
      { type: "custom:energy-flow-card-plus", entities },
      hass
    );
    expect(card.text(".grid .consumption")).toBe("1 kWh");

    collection.setPeriod(day(2).start, day(2).end);
    await card.settle();
    expect(card.text(".grid .return")).toBe("500 Wh");
    expect(card.text("#home-circle")).toBe("2 kWh");
    expect(hass.callWS).toHaveBeenLastCalledWith(
      expect.objectContaining({ start_time: day(2).start.toISOString() })
    );
  });
});

const mountLive = async (options: object = {}) => {
  const hass = fakeHass({
    states: {
      "sensor.grid": sensor("1000", { unit: "Wh" }),
      "sensor.solar": sensor("2000", { unit: "Wh" }),
      "light.kitchen": "off",
    },
    energyCollection: energyCollection(day(1).start, day(1).end),
  });
  const config = {
    type: "custom:energy-flow-card-plus",
    energy_date_selection: false,
    entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.solar" } },
    ...options,
  };
  return { hass, ...(await mountCard(EnergyFlowCardPlus, config, hass)) };
};

describe("updates", () => {
  test("a change to an entity the card does not show neither computes nor renders", async () => {
    const { hass, setHass, updates } = await mountLive();
    await setHass(withStates(hass, { "light.kitchen": "on" }));
    expect(updates()).toBe(0);
  });

  test("a change to a shown entity updates the card once", async () => {
    const { hass, setHass, updates, text } = await mountLive();
    await setHass(withStates(hass, { "sensor.solar": sensor("3000", { unit: "Wh" }) }));
    expect(updates()).toBe(1);
    expect(text(".solar .solar")).toBe("3 kWh");
  });
});

describe("node actions", () => {
  test("nodes are clickable when the config leaves clickable_entities out", async () => {
    const { card, root } = await mountLive();
    const opened: unknown[] = [];
    for (const type of ["hass-more-info", "hass-action"]) {
      card.addEventListener(type, (event) => opened.push(event));
    }
    const circle = root.querySelector<HTMLElement>(".solar .circle");
    if (!circle) {
      throw new Error("solar circle not rendered");
    }
    await userEvent.click(circle);
    expect(opened).toHaveLength(1);
  });
});

describe("buttons", () => {
  test("the buttons follow the dashboard link and hand their tap action to Home Assistant", async () => {
    const { card, root } = await mountLive({
      dashboard_link: "/energy",
      buttons: [{ name: "Solar", tap_action: { action: "navigate", navigation_path: "/solar" } }],
    });
    const actions: unknown[] = [];
    card.addEventListener("hass-action", (event) => {
      actions.push(event instanceof CustomEvent ? event.detail : undefined);
    });
    const buttons = [...root.querySelectorAll<HTMLElement>(".card-actions ha-button")];
    expect(buttons.map((button) => button.getAttribute("href"))).toEqual(["/energy", null]);
    const [, solar] = buttons;
    if (!solar) {
      throw new Error("button not rendered");
    }
    await userEvent.click(solar);
    expect(actions).toEqual([
      expect.objectContaining({
        action: "tap",
        config: expect.objectContaining({
          tap_action: { action: "navigate", navigation_path: "/solar" },
        }),
      }),
    ]);
  });
});

describe("dot speed", () => {
  test("at the same energy, loop time follows the square root of line length", async () => {
    const { root } = await mountCard(
      EnergyFlowCardPlus,
      {
        type: "custom:energy-flow-card-plus",
        entities: {
          grid: { entity: { consumption: "sensor.grid_import" } },
          individual: [{ entity: "sensor.device" }],
        },
      },
      fakeHass({
        statistics: { "sensor.grid_import": 1000, "sensor.device": 1000 },
        energyCollection: energyCollection(day(1).start, day(1).end),
      }),
      { width: 500 }
    );
    const grid = '.flow-dot[data-path="grid"]';
    const device = '.flow-dot[data-path="individual-top"]';
    expect(root.querySelector(grid)?.getAttribute("data-duration")).toBe(
      root.querySelector(device)?.getAttribute("data-duration")
    );
    const short = dotLoop(root, device);
    const long = dotLoop(root, grid);
    expect(short.pixels).toBeLessThan(long.pixels / 2);
    expect(short.seconds / long.seconds).toBeCloseTo(Math.sqrt(short.pixels / long.pixels), 1);
  });
});
