import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { energyCollection, fakeHass, sensor } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyBreakdownCard } from "./energy-breakdown-card";

const kWh = (state: string, name: string) => sensor(state, { unit: "kWh", name });

const states = {
  "sensor.heat_pump": kWh("3", "Heat pump"),
  "sensor.ev": kWh("1.5", "EV charger"),
  "sensor.oven": kWh("0.5", "Oven"),
};

const entities = [
  { entity: "sensor.oven" },
  { entity: "sensor.heat_pump" },
  { entity: "sensor.ev" },
];

const legend = (root: ShadowRoot) =>
  [...root.querySelectorAll(".legend-item")].map((item) =>
    item.textContent?.replace(/\s+/g, " ").trim()
  );

const day = (date: number) => ({
  start: new Date(2026, 0, date, 0, 0, 0),
  end: new Date(2026, 0, date, 23, 59, 59),
});

describe("energy breakdown card", () => {
  test("a bar chart sorts entities by value with their share of the total", async () => {
    const { root, text, markup } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", chart_type: "bar", entities },
      fakeHass({ states })
    );
    expect(legend(root)).toEqual([
      "Heat pump 3 kWh 60%",
      "EV charger 1.5 kWh 30%",
      "Oven 0.5 kWh 10%",
    ]);
    expect(text(".bar-header-value")).toBe("5 kWh Total");
    expect(root.querySelectorAll(".bar-segment")).toHaveLength(3);
    expect(markup()).not.toMatch(/NaN|undefined/);
  });

  test("a donut shows the total in its centre and one segment per entity", async () => {
    const { root, text } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", chart_type: "donut", entities },
      fakeHass({ states })
    );
    expect(text(".center-value")).toBe("5 kWh");
    expect(root.querySelectorAll("path.segment")).toHaveLength(3);
  });

  test("entities beyond max_items are grouped into Other", async () => {
    const { root } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", entities, max_items: 1 },
      fakeHass({ states })
    );
    expect(legend(root)).toEqual(["Heat pump 3 kWh 60%", "Other 2 kWh 40%"]);
  });

  test("unavailable entities count as zero", async () => {
    const { root, markup } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", entities },
      fakeHass({ states: { ...states, "sensor.ev": sensor("unavailable", { unit: "kWh" }) } })
    );
    expect(legend(root)).toEqual(["Heat pump 3 kWh 86%", "Oven 0.5 kWh 14%", "sensor.ev 0 kWh 0%"]);
    expect(markup()).not.toMatch(/NaN|undefined/);
  });

  test("all zero shows that there is no data", async () => {
    const { text, root } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", entities: [{ entity: "sensor.oven" }] },
      fakeHass({ states: { "sensor.oven": kWh("0", "Oven") } })
    );
    expect(text(".empty")).toBe("There is no data to show.");
    expect(root.querySelector(".legend")).toBeNull();
  });

  test("hovering a segment shows its tooltip, clicking it runs its action", async () => {
    const { root, card, text } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", chart_type: "bar", entities },
      fakeHass({ states })
    );
    const actions: unknown[] = [];
    card.addEventListener("hass-action", (event) => {
      actions.push(event instanceof CustomEvent ? event.detail : undefined);
    });
    const segment = root.querySelector('.bar-segment[data-segment-index="0"]');
    if (!segment) {
      throw new Error("no bar segment");
    }

    await userEvent.hover(segment);
    expect(text(".tooltip")).toBe("Heat pump 3 kWh 60.0%");
    expect(actions).toEqual([]);

    await userEvent.click(segment);
    expect(actions).toEqual([
      expect.objectContaining({
        action: "tap",
        config: expect.objectContaining({
          entity: "sensor.heat_pump",
          tap_action: { action: "more-info" },
        }),
      }),
    ]);
  });

  test("Enter on a legend item runs its action", async () => {
    const { root, card } = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", entities },
      fakeHass({ states })
    );
    const actions: unknown[] = [];
    card.addEventListener("hass-action", (event) => {
      actions.push(event instanceof CustomEvent ? event.detail : undefined);
    });
    root.querySelector<HTMLElement>('.legend-item[data-segment-index="1"]')?.focus();
    await userEvent.keyboard("{Enter}");
    expect(actions).toEqual([
      expect.objectContaining({ config: expect.objectContaining({ entity: "sensor.ev" }) }),
    ]);
  });
});

describe("energy breakdown over the dashboard's period", () => {
  test("shows loading, then the period's growth in each entity's unit, and follows period changes", async () => {
    let deliver: ((growth: Record<string, number>) => void) | undefined;
    const firstPeriod = new Promise<Record<string, number>>((resolve) => {
      deliver = resolve;
    });
    const collection = energyCollection(day(1).start, day(1).end);
    const card = await mountCard(
      EnergyBreakdownCard,
      { type: "custom:energy-breakdown-card", entities, energy_date_selection: true },
      fakeHass({
        states,
        statistics: (window) =>
          window.start.getDate() === 1
            ? firstPeriod
            : { "sensor.heat_pump": 1000, "sensor.ev": 3000, "sensor.oven": 0 },
        energyCollection: collection,
      })
    );
    expect(card.text(".card-content")).toBe("Loading…");

    deliver?.({ "sensor.heat_pump": 6000, "sensor.ev": 3000, "sensor.oven": 1000 });
    await card.settle();
    expect(legend(card.root)).toEqual([
      "Heat pump 6 kWh 60%",
      "EV charger 3 kWh 30%",
      "Oven 1 kWh 10%",
    ]);

    collection.setPeriod(day(2).start, day(2).end);
    await card.settle();
    expect(legend(card.root)).toEqual([
      "EV charger 3 kWh 75%",
      "Heat pump 1 kWh 25%",
      "Oven 0 kWh 0%",
    ]);
  });
});
