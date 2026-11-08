import { describe, expect, test } from "vite-plus/test";
import {
  energyCollection,
  fakeHass,
  type StateFixtures,
} from "@flixlix-cards/shared/testing/fake-hass";
import {
  asEnergyUnits,
  expectFlowCard,
  flowScenarios,
} from "@flixlix-cards/shared/testing/flow-scenarios";
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
