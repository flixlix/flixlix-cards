import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  emitTemplate,
  fakeHass,
  sensor,
  withStates,
} from "@flixlix-cards/shared/testing/fake-hass";
import { expectFlowCard } from "@flixlix-cards/shared/testing/expect-flow-card";
import { flowScenarios } from "@flixlix-cards/shared/testing/flow-scenarios";
import { type MountedCard, mountCard } from "@flixlix-cards/shared/testing/mount-card";
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

/** Where the nodes and lines sit inside the card when the page has the given direction. */
const nodePositions = async (dir: "ltr" | "rtl") => {
  document.documentElement.dir = dir;
  const { card, root } = await mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
      },
    },
    fakeHass({
      states: { "sensor.grid": "300", "sensor.solar": "100", "sensor.battery": "50" },
    })
  );
  const origin = card.getBoundingClientRect();
  return Object.fromEntries(
    [".grid .circle", ".home .circle", ".solar .circle", ".battery .circle", ".lines svg"].map(
      (selector) => {
        const box = root.querySelector(selector)?.getBoundingClientRect();
        return [selector, box && { x: box.x - origin.x, y: box.y - origin.y }];
      }
    )
  );
};

describe("labels", () => {
  test("the non-fossil node is labelled like Home Assistant's energy distribution card", async () => {
    const { text } = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: {
          grid: { entity: "sensor.grid" },
          fossil_fuel_percentage: { entity: "sensor.fossil" },
        },
      },
      fakeHass({ states: { "sensor.grid": "800", "sensor.fossil": sensor("40", { unit: "%" }) } })
    );
    expect(text(".circle-container.low-carbon .label")).toBe("Low-carbon");
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
    expect(card.text("span.individual-right-top")).toBe("2 W");
    expect(card.text("span.individual-right-bottom")).toBe("1 W");
  });

  test("a right-to-left page keeps circles where the lines meet them", async () => {
    onTestFinished(() => {
      document.documentElement.dir = "";
    });
    const ltr = await nodePositions("ltr");
    const rtl = await nodePositions("rtl");

    expect(rtl[".grid .circle"]?.x).toBeLessThan(rtl[".home .circle"]?.x ?? 0);
    expect(rtl).toEqual(ltr);
  });
});

const centerOf = (element: Element | null) => {
  const box = element?.getBoundingClientRect();
  if (!box) {
    throw new Error("element to measure from is not rendered");
  }
  return new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
};

/** Where a dot is on screen at a fraction of its loop. */
const dotAt = (root: ShadowRoot, selector: string, fraction: number) => {
  const dot = root.querySelector(selector);
  const [animation] = dot?.getAnimations() ?? [];
  if (!dot || !animation) {
    throw new Error(`${selector} is not a moving dot`);
  }
  animation.pause();
  animation.currentTime = Number(animation.effect?.getTiming().duration) * fraction;
  return centerOf(dot.querySelector("circle"));
};

const distance = (a: DOMPoint, b: DOMPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Whether the dot ends its loop closer to the target than it starts it. */
const runsTowards = (root: ShadowRoot, selector: string, target: string) => {
  const start = dotAt(root, selector, 0.05);
  const end = dotAt(root, selector, 0.95);
  const center = centerOf(root.querySelector(target));
  return distance(end, center) < distance(start, center);
};

describe("dot direction", () => {
  test("a battery charging from the grid has its dot run from the grid to the battery", async () => {
    const scenario = flowScenarios.find(({ name }) => name === "battery charging from the grid");
    if (!scenario) {
      throw new Error("battery charging scenario missing");
    }
    const { root } = await mountCard(
      PowerFlowCardPlus,
      { type: "custom:power-flow-card-plus", entities: scenario.entities },
      fakeHass({ states: scenario.states })
    );
    const dot = '.flow-dot[data-path="battery-grid"]:has(circle.battery-from-grid)';
    expect(runsTowards(root, dot, ".battery .circle")).toBe(true);
    expect(runsTowards(root, dot, ".grid .circle")).toBe(false);
  });
});

const slots = ["left-top", "left-bottom", "right-top", "right-bottom"] as const;

const linePaths = {
  "left-top": "individual-top",
  "left-bottom": "individual-bottom",
  "right-top": "individual-top-right-home",
  "right-bottom": "individual-bottom-right-home",
};

const mountDirections = async (states: string[], individual: object = {}) => {
  const card = await mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      sort_individual_devices: false,
      entities: {
        grid: { entity: "sensor.grid" },
        individual: slots.map((_, index) => ({
          entity: `sensor.device_${index}`,
          show_direction: true,
          ...individual,
        })),
      },
    },
    fakeHass({
      states: {
        "sensor.grid": "1000",
        ...Object.fromEntries(states.map((state, index) => [`sensor.device_${index}`, state])),
      },
    }),
    { width: 500 }
  );
  const arrow = (slot: string) => {
    const icon = card.root.querySelector(`span.individual-${slot} ha-icon`);
    return icon && "icon" in icon ? icon.icon : undefined;
  };
  const runsIntoHome = (slot: (typeof slots)[number]) =>
    runsTowards(card.root, `.flow-dot[data-path="${linePaths[slot]}"]`, ".home .circle");
  return { card, arrow, runsIntoHome };
};

describe("individual direction", () => {
  test("each slot's arrow points from the home to the device", async () => {
    const { arrow } = await mountDirections(["40", "30", "20", "10"]);
    expect(slots.map(arrow)).toEqual([
      "mdi:arrow-up",
      "mdi:arrow-down",
      "mdi:arrow-up",
      "mdi:arrow-down",
    ]);
  });

  test("each slot's dot runs from the home to the device", async () => {
    const { runsIntoHome } = await mountDirections(["40", "30", "20", "10"]);
    expect(slots.map(runsIntoHome)).toEqual([false, false, false, false]);
  });

  test("with accept_negative, a device feeding power shows its sign and flows into the home", async () => {
    const { card, arrow, runsIntoHome } = await mountDirections(["-40", "30", "20", "-10"], {
      accept_negative: true,
    });
    expect(slots.map((slot) => card.text(`span.individual-${slot}`))).toEqual([
      "-40 W",
      "30 W",
      "20 W",
      "-10 W",
    ]);
    expect(slots.map(arrow)).toEqual([
      "mdi:arrow-down",
      "mdi:arrow-down",
      "mdi:arrow-up",
      "mdi:arrow-up",
    ]);
    expect(slots.map(runsIntoHome)).toEqual([true, false, false, true]);
  });

  test("without accept_negative, a negative reading keeps its magnitude and direction", async () => {
    const { card, arrow, runsIntoHome } = await mountDirections(["-40", "30", "20", "-10"]);
    expect(card.text("span.individual-left-top")).toBe("40 W");
    expect(card.text("span.individual-right-bottom")).toBe("10 W");
    expect(slots.map(arrow)).toEqual([
      "mdi:arrow-up",
      "mdi:arrow-down",
      "mdi:arrow-up",
      "mdi:arrow-down",
    ]);
    expect(slots.map(runsIntoHome)).toEqual([false, false, false, false]);
  });
});

const priceTemplate = "{{ states('sensor.cost') }}";

const watchedConfig = {
  type: "custom:power-flow-card-plus",
  entities: {
    grid: { entity: "sensor.grid" },
    solar: { entity: "sensor.solar" },
    home: { entity: "sensor.home", secondary_info: { template: priceTemplate } },
  },
};

const mountWatched = async () => {
  const hass = fakeHass({
    states: { "sensor.grid": "300", "sensor.solar": "100", "light.kitchen": "off" },
    templates: { [priceTemplate]: "1.20 €" },
  });
  return { hass, ...(await mountCard(PowerFlowCardPlus, watchedConfig, hass)) };
};

/** Toggles a light the card does not show, one Lit update per toggle. */
const toggleKitchenLight = async (card: MountedCard, hass: HomeAssistant, times: number) => {
  if (times === 0) {
    return;
  }
  const next = withStates(hass, { "light.kitchen": times % 2 ? "on" : "off" });
  card.card.hass = next;
  await card.card.updateComplete;
  await toggleKitchenLight(card, next, times - 1);
};

describe("updates", () => {
  test("changes to an entity the card does not show neither compute nor render", async () => {
    const { hass, ...card } = await mountWatched();
    await toggleKitchenLight(card, hass, 100);
    await card.settle();
    expect(card.updates()).toBe(0);
  });

  test("a change to a shown entity updates the card once", async () => {
    const { hass, updates, setHass, text } = await mountWatched();
    await setHass(withStates(hass, { "sensor.solar": "250" }));
    expect(updates()).toBe(1);
    expect(text(".solar .solar")).toBe("250 W");
  });

  test("a new template result updates the card", async () => {
    const { hass, settle, text } = await mountWatched();
    emitTemplate(hass, priceTemplate, "1.25 €");
    await settle();
    expect(text(".home .secondary-info")).toBe("1.25 €");
  });

  test("a template result arriving with an unrelated change still updates the card", async () => {
    const { card, hass, settle, text } = await mountWatched();
    emitTemplate(hass, priceTemplate, "1.25 €");
    card.hass = withStates(hass, { "light.kitchen": "on" });
    await settle();
    expect(text(".home .secondary-info")).toBe("1.25 €");
  });

  test("a new config updates the card", async () => {
    const { card, hass, setHass, text } = await mountWatched();
    const solar = { entity: "sensor.roof" };
    card.setConfig({ ...watchedConfig, entities: { ...watchedConfig.entities, solar } });
    await setHass(withStates(hass, { "sensor.roof": "400" }));
    expect(text(".solar .solar")).toBe("400 W");
  });
});

/** HA's name formatter, composing `area` and `entity` parts; a plain string is kept. */
const nameFormatter = (area: string) => (_stateObj: unknown, name: unknown) => {
  if (typeof name === "string") {
    return name;
  }
  const parts: { type: string }[] = Array.isArray(name) ? name : [{ type: "entity" }];
  return parts.map((part) => (part.type === "area" ? area : "Grid power")).join(" ");
};

/** A Home Assistant of `version` with a name formatter and an entity registry. */
const namingHass = (version: string): HomeAssistant => {
  const hass = fakeHass({
    states: { "sensor.grid": sensor("100", { name: "Utility room Shelly EM Grid power" }) },
  });
  return Object.assign(hass, {
    config: { ...hass.config, version },
    entities: {},
    formatEntityName: nameFormatter("Utility room"),
  });
};

const mountNamed = (grid: object, hass: HomeAssistant) =>
  mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid", ...grid } },
    },
    hass
  );

describe("entity names", () => {
  test("from HA 2026.4, use_metadata takes the composed name", async () => {
    const { text } = await mountNamed({ use_metadata: true }, namingHass("2026.4.0"));
    expect(text(".grid .label")).toBe("Grid power");
  });

  test("from HA 2026.4, a structured name is composed from its parts", async () => {
    const name = [{ type: "area" }, { type: "entity" }];
    const { text } = await mountNamed({ name }, namingHass("2026.4.0"));
    expect(text(".grid .label")).toBe("Utility room Grid power");
  });

  test("before HA 2026.4, names come from friendly_name and a plain name is kept", async () => {
    const hass = namingHass("2026.3.0");
    const structured = await mountNamed({ name: [{ type: "area" }] }, hass);
    expect(structured.text(".grid .label")).toBe("Utility room Shelly EM Grid power");
    const plain = await mountNamed({ name: "Netz" }, hass);
    expect(plain.text(".grid .label")).toBe("Netz");
  });

  test("a renamed area updates the label without a state change", async () => {
    const name = [{ type: "area" }, { type: "entity" }];
    const hass = namingHass("2026.4.0");
    const { setHass, text } = await mountNamed({ name }, hass);
    // Only the registries and the formatter are new, as when HA renames an area.
    await setHass(
      Object.assign({ ...hass }, { entities: {}, formatEntityName: nameFormatter("Basement") })
    );
    expect(text(".grid .label")).toBe("Basement Grid power");
  });
});
