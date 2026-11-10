import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  emitTemplate,
  fakeHass,
  sensor,
  withStates,
} from "@flixlix-cards/shared/testing/fake-hass";
import { dotLoop } from "@flixlix-cards/shared/testing/dot-loop";
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

const mountGrid = async (grid: object = {}, options: object = { clickable_entities: true }) => {
  const mounted = await mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      ...options,
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

  test("nodes are clickable when the config leaves clickable_entities out", async () => {
    const { circle, events } = await mountGrid({}, {});
    await userEvent.click(circle);
    expect(events).toHaveLength(1);
    expect(events.every(opensGridMoreInfo)).toBe(true);
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
      {
        type: "custom:power-flow-card-plus",
        clickable_entities: false,
        entities: { grid: { entity: "sensor.grid" } },
      },
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

const solarHomeCircles = async (entities: object) => {
  const { root } = await mountCard(
    PowerFlowCardPlus,
    { type: "custom:power-flow-card-plus", entities },
    fakeHass({ states: { "sensor.grid": "100", "sensor.solar": "300", "sensor.battery": "0" } }),
    { width: 500 }
  );
  return {
    content: centerOf(root.querySelector(".card-content")),
    solar: centerOf(root.querySelector(".solar .circle")),
    battery: root.querySelector(".battery .circle")
      ? centerOf(root.querySelector(".battery .circle"))
      : undefined,
    home: centerOf(root.querySelector(".home .circle")),
  };
};

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

  test("without a grid, solar and home keep the spacing they have with one", async () => {
    const solarAndBattery = {
      solar: { entity: "sensor.solar" },
      battery: { entity: "sensor.battery" },
    };
    const withGrid = await solarHomeCircles({
      grid: { entity: "sensor.grid" },
      ...solarAndBattery,
    });
    const withoutGrid = await solarHomeCircles(solarAndBattery);

    expect(withoutGrid.home.x - withoutGrid.solar.x).toBeCloseTo(
      withGrid.home.x - withGrid.solar.x,
      0
    );
    expect(withoutGrid.battery?.x).toBeCloseTo(withoutGrid.solar.x, 0);
  });

  test("without a grid, solar and battery beside a lone home move right to look centred", async () => {
    const { content, solar, home } = await solarHomeCircles({
      solar: { entity: "sensor.solar" },
      battery: { entity: "sensor.battery" },
    });
    const pitch = home.x - solar.x;
    const centroid = (2 * solar.x + home.x) / 3;

    expect((solar.x + home.x) / 2 - content.x).toBeCloseTo(pitch / 9, 0);
    expect(content.x - centroid).toBeCloseTo(pitch / 18, 0);
  });

  test("without a grid, solar and home alone balance and stay centred", async () => {
    const { content, solar, home } = await solarHomeCircles({ solar: { entity: "sensor.solar" } });

    expect((solar.x + home.x) / 2).toBeCloseTo(content.x, 0);
  });

  test("stays under a fixed overlay earlier on the page, like a floating nav bar", async () => {
    const { circle } = await mountGrid();
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; inset: 0; z-index: 1;";
    document.body.prepend(overlay);
    onTestFinished(() => overlay.remove());

    const box = circle.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    expect(hit).toBe(overlay);
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

const mountAuxiliary = async (auxiliary: object, reading = "450") =>
  mountCard(
    PowerFlowCardPlus,
    {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        battery: { entity: "sensor.battery" },
        auxiliary: { entity: "sensor.auxiliary", name: "Gas", ...auxiliary },
      },
    },
    fakeHass({
      states: { "sensor.grid": "1000", "sensor.battery": "200", "sensor.auxiliary": reading },
    }),
    { width: 500 }
  );

const auxiliaryDot = '.flow-dot[data-path="auxiliary-line"]';

describe("auxiliary node", () => {
  test("sits under the grid, left of the battery", async () => {
    const { root, text } = await mountAuxiliary({});
    const auxiliary = centerOf(root.querySelector(".auxiliary .circle"));
    const grid = centerOf(root.querySelector(".grid .circle"));
    const battery = centerOf(root.querySelector(".battery .circle"));
    expect(auxiliary.x).toBeCloseTo(grid.x, 0);
    expect(auxiliary.y).toBeCloseTo(battery.y, 0);
    expect(text(".circle-container.auxiliary .label")).toBe("Gas");
    expect(text("span.auxiliary")).toBe("450 W");
  });

  test("its dot runs from the grid, or from the battery with connect_to: battery", async () => {
    const grid = await mountAuxiliary({});
    expect(runsTowards(grid.root, auxiliaryDot, ".auxiliary .circle")).toBe(true);
    expect(runsTowards(grid.root, auxiliaryDot, ".grid .circle")).toBe(false);

    const battery = await mountAuxiliary({ connect_to: "battery" });
    expect(runsTowards(battery.root, auxiliaryDot, ".auxiliary .circle")).toBe(true);
    expect(runsTowards(battery.root, auxiliaryDot, ".battery .circle")).toBe(false);
  });

  test("with accept_negative, a negative reading flows into the node it connects to", async () => {
    const { root } = await mountAuxiliary({ accept_negative: true }, "-450");
    expect(runsTowards(root, auxiliaryDot, ".grid .circle")).toBe(true);
  });

  test("the grid keeps its label slot but drops its name while the line runs up into it", async () => {
    const toGrid = await mountAuxiliary({});
    expect(toGrid.text(".circle-container.grid > .label")).toBe("");
    const toBattery = await mountAuxiliary({ connect_to: "battery" });
    expect(toBattery.text(".circle-container.grid > .label")).toBe("Grid");
  });

  test("connect_to: none draws no line", async () => {
    const { root } = await mountAuxiliary({ connect_to: "none" });
    expect(root.querySelector(".auxiliary .circle")).not.toBeNull();
    expect(root.querySelector("#auxiliary-line")).toBeNull();
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

describe("individual visibility (#332)", () => {
  test("a device shows only while its conditions hold, following the entity they read", async () => {
    const hass = fakeHass({
      states: { "sensor.grid": "300", "sensor.ev": "0", "binary_sensor.ev_plugged": "off" },
    });
    const { root, setHass, text } = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: {
          grid: { entity: "sensor.grid" },
          individual: [
            {
              entity: "sensor.ev",
              display_zero: true,
              visibility: [{ condition: "state", entity: "binary_sensor.ev_plugged", state: "on" }],
            },
          ],
        },
      },
      hass
    );
    expect(root.querySelector("span.individual-left-top")).toBeNull();

    const pluggedIn = withStates(hass, { "binary_sensor.ev_plugged": "on" });
    await setHass(pluggedIn);
    expect(text("span.individual-left-top")).toBe("0 W");

    await setHass(withStates(pluggedIn, { "binary_sensor.ev_plugged": "off" }));
    expect(root.querySelector("span.individual-left-top")).toBeNull();
  });
});

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

  test("a greyed-out idle circle takes its colour back when power returns", async () => {
    const hass = fakeHass({ states: { "sensor.grid": "300", "sensor.ev": "0" } });
    const { root, setHass } = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        display_zero_lines: {
          mode: "grey_out",
          grey_color: [200, 200, 200],
          grey_out_circles: true,
        },
        entities: {
          grid: { entity: "sensor.grid" },
          individual: [{ entity: "sensor.ev", display_zero: true }],
        },
      },
      hass
    );
    const borderColor = () => {
      const circle = root.querySelector(".individual-top .circle");
      if (!circle) {
        throw new Error("individual circle not rendered");
      }
      return getComputedStyle(circle).borderTopColor;
    };
    expect(borderColor()).toBe("rgb(200, 200, 200)");
    await setHass(withStates(hass, { "sensor.ev": "106" }));
    expect(borderColor()).toBe("rgb(208, 204, 91)");
  });
});

const colorOf = (root: ParentNode, selector: string) => {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`${selector} not rendered`);
  }
  return getComputedStyle(element).color;
};

describe("power outage", () => {
  const outageHass = fakeHass({
    states: { "sensor.grid": "300", "binary_sensor.grid_down": "on" },
  });
  const mountOutage = (powerOutage: object) =>
    mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: {
          grid: {
            entity: "sensor.grid",
            power_outage: { entity: "binary_sensor.grid_down", ...powerOutage },
          },
        },
      },
      outageHass
    );

  test("color_alert colours the outage icon and label", async () => {
    const { root } = await mountOutage({ color_alert: [255, 0, 0] });
    expect(colorOf(root, "#grid-icon")).toBe("rgb(255, 0, 0)");
    expect(colorOf(root, ".power-outage")).toBe("rgb(255, 0, 0)");
  });

  test("without color_alert the outage looks as before", async () => {
    const { root } = await mountOutage({});
    const primaryText = colorOf(root, ".card-content");
    expect(colorOf(root, "#grid-icon")).toBe(primaryText);
    expect(colorOf(root, ".power-outage")).toBe(primaryText);
  });

  test("the icon takes its usual colour back when the power returns", async () => {
    const { root, setHass } = await mountOutage({ color_alert: "#ff0000" });
    await setHass(withStates(outageHass, { "binary_sensor.grid_down": "off" }));
    expect(colorOf(root, "#grid-icon")).toBe(colorOf(root, ".card-content"));
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

describe("dot speed", () => {
  test("at the same power, loop time follows the square root of line length", async () => {
    const { root } = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: {
          grid: { entity: "sensor.grid" },
          individual: [{ entity: "sensor.device" }],
        },
      },
      fakeHass({ states: { "sensor.grid": "1000", "sensor.device": "1000" } }),
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

const gridDot = '.flow-dot[data-path="grid"]';

const motionOf = (root: ShadowRoot, selector: string) => {
  const [animation] = root.querySelector(selector)?.getAnimations() ?? [];
  if (!animation) {
    throw new Error(`${selector} is not a moving dot`);
  }
  return animation;
};

describe("dot motion across updates", () => {
  test("an update that leaves a dot's speed alone keeps its motion untouched", async () => {
    const { root, hass, card, text } = await mountWatched();
    const before = motionOf(root, gridDot);
    before.currentTime = 1234;
    emitTemplate(hass, priceTemplate, "1.25 €");
    await card.updateComplete;
    expect(text(".home .secondary-info")).toBe("1.25 €");
    const after = motionOf(root, gridDot);
    expect(after).toBe(before);
    expect(after.currentTime).toBe(1234);
  });

  test("a new speed carries on from where the dot is, with the same motion", async () => {
    const { root, hass, setHass } = await mountWatched();
    const before = motionOf(root, gridDot);
    const slow = dotLoop(root, gridDot).seconds;
    await setHass(withStates(hass, { "sensor.grid": "3000" }));
    expect(motionOf(root, gridDot)).toBe(before);
    expect(dotLoop(root, gridDot).seconds).toBeLessThan(slow);
  });
});

const homeValue = ".home span.home:not(.secondary-info)";

describe("custom CSS", () => {
  test("styles the home's value apart from its icon and secondary info, like the other circles", async () => {
    const { root, text } = await mountWatched();
    const custom = new CSSStyleSheet();
    custom.replaceSync(`${homeValue} { color: rgb(255, 0, 0); }`);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, custom];
    expect(text(homeValue)).toBe("400 W");
    expect(colorOf(root, homeValue)).toBe("rgb(255, 0, 0)");
    expect(colorOf(root, ".home .secondary-info")).not.toBe("rgb(255, 0, 0)");
    expect(colorOf(root, "#home-icon")).not.toBe("rgb(255, 0, 0)");
  });
});
