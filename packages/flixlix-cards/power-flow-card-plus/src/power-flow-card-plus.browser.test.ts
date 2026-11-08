import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { expectFlowCard, flowScenarios } from "@flixlix-cards/shared/testing/flow-scenarios";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { PowerFlowCardPlus } from "./power-flow-card-plus";

describe("power flow card scenarios", () => {
  test.for(flowScenarios)("$name", async (scenario) => {
    const card = await mountCard(
      PowerFlowCardPlus,
      { type: "custom:power-flow-card-plus", ...scenario.options, entities: scenario.entities },
      fakeHass({ states: scenario.states, templates: scenario.templates }),
      { width: scenario.width }
    );
    expectFlowCard(card, scenario.expect);
  });
});

type HaEvent = { type: string; detail: unknown };

const recordHaEvents = (card: HTMLElement): HaEvent[] => {
  const events: HaEvent[] = [];
  for (const type of ["hass-more-info", "hass-action"]) {
    card.addEventListener(type, (event) => {
      events.push({ type, detail: event instanceof CustomEvent ? event.detail : undefined });
    });
  }
  return events;
};

/** Home Assistant opens the grid's more-info dialog for either event. */
const gridMoreInfo = [
  expect.objectContaining({ entityId: "sensor.grid" }),
  expect.objectContaining({
    action: "tap",
    config: expect.objectContaining({ entity: "sensor.grid", tap_action: { action: "more-info" } }),
  }),
];

const opensGridMoreInfo = ({ detail }: HaEvent) =>
  gridMoreInfo.some((matcher) => matcher.asymmetricMatch(detail) === true);

const mountGrid = async (grid: object = {}) => {
  const mounted = await mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      clickable_entities: true,
      entities: { grid: { entity: "sensor.grid", ...grid }, solar: { entity: "sensor.solar" } },
    },
    fakeHass({ states: { "sensor.grid": "300", "sensor.solar": "100" } })
  );
  const circle = mounted.root.querySelector<HTMLElement>(".grid .circle");
  if (!circle) {
    throw new Error("grid circle not rendered");
  }
  return { ...mounted, circle, events: recordHaEvents(mounted.card) };
};

const holdFor = async (element: Element, milliseconds: number) => {
  await userEvent.pointer({ target: element, keys: "[MouseLeft>]" });
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
  await userEvent.pointer("[/MouseLeft]");
};

describe("node actions", () => {
  test("tapping a node opens its more-info dialog", async () => {
    const { circle, events } = await mountGrid();
    await userEvent.click(circle);
    expect(events).toEqual([{ type: "hass-more-info", detail: { entityId: "sensor.grid" } }]);
  });

  test("a configured tap action is handed to Home Assistant", async () => {
    const { circle, events } = await mountGrid({
      tap_action: { action: "navigate", navigation_path: "/energy" },
    });
    await userEvent.click(circle);
    expect(events).toEqual([
      {
        type: "hass-action",
        detail: expect.objectContaining({
          action: "tap",
          config: expect.objectContaining({
            entity: "sensor.grid",
            tap_action: { action: "navigate", navigation_path: "/energy" },
          }),
        }),
      },
    ]);
  });

  test("double-tapping runs the double-tap action instead of the tap action", async () => {
    const { circle, events } = await mountGrid({
      tap_action: { action: "more-info" },
      double_tap_action: { action: "toggle" },
    });
    await userEvent.dblClick(circle);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(events.map((event) => event.detail)).toEqual([
      expect.objectContaining({ action: "double_tap" }),
    ]);
  });

  test("holding runs the hold action and swallows the click that ends it", async () => {
    const { circle, events } = await mountGrid({
      tap_action: { action: "more-info" },
      hold_action: { action: "toggle" },
    });
    await holdFor(circle, 600);
    expect(events.map((event) => event.detail)).toEqual([
      expect.objectContaining({ action: "hold" }),
    ]);
  });

  test("a short press is a tap, not a hold", async () => {
    const { circle, events } = await mountGrid({
      tap_action: { action: "more-info" },
      hold_action: { action: "toggle" },
    });
    await holdFor(circle, 50);
    expect(events.map((event) => event.detail)).toEqual([
      expect.objectContaining({ action: "tap" }),
    ]);
  });

  test("Enter on a focused node opens its more-info dialog", async () => {
    const { root, circle, events } = await mountGrid();
    circle.focus();
    expect(root.activeElement).toBe(circle);
    await userEvent.keyboard("{Enter}");
    expect(events).toHaveLength(1);
    expect(events.every(opensGridMoreInfo)).toBe(true);
  });

  test("nodes are not focusable when entities are not clickable", async () => {
    const { root } = await mountCard(
      PowerFlowCardPlus,
      { type: "custom:power-flow-card-plus", entities: { grid: { entity: "sensor.grid" } } },
      fakeHass({ states: { "sensor.grid": "300" } })
    );
    expect(root.querySelector(".grid .circle")?.hasAttribute("tabindex")).toBe(false);
  });
});

describe("layout", () => {
  test("resizing between narrow and wide moves individuals in and out of the right slots", async () => {
    const individual = [1, 2, 3, 4].map((index) => ({ entity: `sensor.device_${index}` }));
    const card = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" }, individual },
      },
      fakeHass({
        states: {
          "sensor.grid": "100",
          "sensor.device_1": "1",
          "sensor.device_2": "2",
          "sensor.device_3": "3",
          "sensor.device_4": "4",
        },
      }),
      { width: 500 }
    );
    expect(card.root.querySelector(".individual-right-bottom")).not.toBeNull();

    await card.resize(340);
    expect(card.root.querySelector(".individual-right-top")).toBeNull();
    expect(card.root.querySelector(".individual-right-bottom")).toBeNull();

    await card.resize(500);
    expect(card.text("span.individual-right-top")).toBe("3 W");
    expect(card.text("span.individual-right-bottom")).toBe("4 W");
  });
});
