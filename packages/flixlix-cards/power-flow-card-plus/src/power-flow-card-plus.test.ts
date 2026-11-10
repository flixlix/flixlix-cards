import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { type Connection } from "home-assistant-js-websocket";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { PowerFlowCardPlus } from "./power-flow-card-plus";
// test that the card renders correctly

// jsdom does not provide ResizeObserver; stub it so the card's `updated` hook doesn't throw
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

function makeHass(states: Record<string, string> = {}): HomeAssistant {
  const hassStates: HomeAssistant["states"] = {};
  for (const [entityId, state] of Object.entries(states)) {
    hassStates[entityId] = {
      entity_id: entityId,
      state,
      attributes: { friendly_name: entityId, unit_of_measurement: "W" },
      last_changed: "",
      last_updated: "",
      context: { id: "", user_id: null, parent_id: null },
    };
  }
  const hass: Partial<HomeAssistant> = {
    localize: (key: string) => key,
    locale: {
      language: "en",
      number_format: NumberFormat.comma_decimal,
      time_format: TimeFormat.language,
    },
    states: hassStates,
    config: {} as HomeAssistant["config"],
    user: { name: "test" } as HomeAssistant["user"],
    connection: {} as Connection,
  };
  return hass as HomeAssistant;
}

const thinSpace = "\u2009";

async function renderCard(config: PowerFlowCardPlusConfig, hass: HomeAssistant) {
  const card = new PowerFlowCardPlus();
  card.setConfig(config);
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  const root = card.shadowRoot!;
  const text = (selector: string) => root.querySelector(selector)?.textContent?.trim();
  return { card, root, text };
}

describe("render", () => {
  test("renders correctly", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
      },
    } as PowerFlowCardPlusConfig;
    const card = new PowerFlowCardPlus();
    card.setConfig(config);
    card.connectedCallback();
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });
});

describe("rendered values", () => {
  test("grid-only consumption is shown on the grid and the home", async () => {
    const { text, root } = await renderCard(
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" } },
      } as PowerFlowCardPlusConfig,
      makeHass({ "sensor.grid": "500" })
    );

    expect(text(".grid .consumption")).toBe(`500${thinSpace}W`);
    expect(text("#home-circle")).toContain(`500${thinSpace}W`);
    expect(root.querySelector(".circle-container.solar")).toBeNull();
    expect(root.querySelector(".circle-container.battery")).toBeNull();
  });

  test("solar covering the home leaves the grid line without dots", async () => {
    const { text, root } = await renderCard(
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.solar" } },
      } as PowerFlowCardPlusConfig,
      makeHass({ "sensor.grid": "0", "sensor.solar": "1000" })
    );

    expect(text(".grid .consumption")).toBe(`0${thinSpace}W`);
    expect(text("#home-circle")).toContain(`1${thinSpace}kW`);
    expect(root.querySelector('.flow-dot[data-path="grid"]')).toBeNull();
    expect(root.querySelector('.flow-dot[data-path="solar"]')).not.toBeNull();
  });

  test("grid below its zero tolerance shows as 0", async () => {
    const { text } = await renderCard(
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid", display_zero_tolerance: 5 } },
      } as PowerFlowCardPlusConfig,
      makeHass({ "sensor.grid": "3" })
    );

    expect(text(".grid .consumption")).toBe(`0${thinSpace}W`);
  });

  test("an individual device with a negative reading stays visible", async () => {
    const { text } = await renderCard(
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" }, individual: [{ entity: "sensor.device" }] },
      } as PowerFlowCardPlusConfig,
      makeHass({ "sensor.grid": "100", "sensor.device": "-50" })
    );

    expect(text(".individual-left-top")).toBe(`50${thinSpace}W`);
  });

  test("unavailable entities render without NaN", async () => {
    const { root } = await renderCard(
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.solar" } },
      } as PowerFlowCardPlusConfig,
      makeHass({ "sensor.grid": "unavailable", "sensor.solar": "unavailable" })
    );

    expect(root.innerHTML).not.toContain("NaN");
  });
});

function makeSubscribingHass(subscribed: string[], unsubscribed: string[]): HomeAssistant {
  const subscribeMessage: Connection["subscribeMessage"] = (_callback, message) => {
    const template = String(message.template);
    subscribed.push(template);
    return Promise.resolve(() => {
      unsubscribed.push(template);
      return Promise.resolve();
    });
  };
  const hass: Partial<HomeAssistant> = {
    localize: (key: string) => key,
    states: {},
    user: { name: "test" } as HomeAssistant["user"],
    connection: { subscribeMessage } as Connection,
  };
  return hass as HomeAssistant;
}

const individualTemplates = ["ind0", "ind1", "ind2", "ind3", "ind4", "ind5"];

const templateConfig = {
  type: "custom:power-flow-card-plus",
  entities: {
    grid: { entity: "sensor.grid", secondary_info: { template: "grid" } },
    solar: { entity: "sensor.solar", secondary_info: { template: "solar" } },
    home: { entity: "sensor.home", secondary_info: { template: "home" } },
    fossil_fuel_percentage: {
      entity: "sensor.fossil",
      secondary_info: { template: "nonFossil" },
    },
    individual: individualTemplates.map((template, index) => ({
      entity: `sensor.device_${index}`,
      secondary_info: { template },
    })),
  },
} as PowerFlowCardPlusConfig;

describe("secondary info template subscriptions", () => {
  test("every subscribed template is unsubscribed on disconnect", async () => {
    const subscribed: string[] = [];
    const unsubscribed: string[] = [];
    const card = new PowerFlowCardPlus();
    card.setConfig(templateConfig);
    card.hass = makeSubscribingHass(subscribed, unsubscribed);

    document.body.append(card);
    await card.updateComplete;
    expect(subscribed).toEqual(["grid", "solar", "home", "nonFossil", ...individualTemplates]);

    card.remove();
    await vi.waitFor(() => {
      expect(unsubscribed).toEqual(subscribed);
    });
  });
});

async function mountSolar(solar: Record<string, unknown>, options: Record<string, unknown> = {}) {
  const card = new PowerFlowCardPlus();
  card.setConfig({
    type: "custom:power-flow-card-plus",
    entities: { solar: { entity: "sensor.solar", ...solar } },
    clickable_entities: true,
    ...options,
  } as PowerFlowCardPlusConfig);
  card.hass = makeHass({ "sensor.solar": "500" });
  const dispatched: Array<{ type: string; detail: unknown }> = [];
  for (const type of ["hass-action", "hass-more-info"]) {
    card.addEventListener(type, (ev) => {
      dispatched.push({ type, detail: ev instanceof CustomEvent ? ev.detail : undefined });
    });
  }
  document.body.append(card);
  const circle = await vi.waitFor(() => {
    const element = card.shadowRoot?.querySelector<HTMLElement>(".circle-container.solar .circle");
    if (!element) {
      throw new Error("solar circle not rendered");
    }
    return element;
  });
  const actions = () =>
    dispatched.map(({ type, detail }) =>
      type === "hass-action" && typeof detail === "object" && detail && "action" in detail
        ? detail.action
        : type
    );
  return { circle, dispatched, actions };
}

const tap = (node: HTMLElement) => {
  node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  node.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const allActions = {
  tap_action: { action: "toggle" },
  hold_action: { action: "more-info" },
  double_tap_action: { action: "navigate", navigation_path: "/energy" },
};

describe("entity actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  test("a tap without a double-tap action fires tap_action immediately", async () => {
    const { circle, dispatched } = await mountSolar({ tap_action: { action: "toggle" } });

    tap(circle);

    expect(dispatched).toEqual([
      {
        type: "hass-action",
        detail: {
          action: "tap",
          config: { entity: "sensor.solar", tap_action: { action: "toggle" } },
        },
      },
    ]);
  });

  test("an entity without actions opens more-info on tap", async () => {
    const { circle, dispatched } = await mountSolar({});

    tap(circle);

    expect(dispatched).toEqual([{ type: "hass-more-info", detail: { entityId: "sensor.solar" } }]);
  });

  test("a single tap waits out the double-tap window before firing tap_action", async () => {
    const { circle, actions } = await mountSolar(allActions);

    tap(circle);
    vi.advanceTimersByTime(249);
    expect(actions()).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(actions()).toEqual(["tap"]);
  });

  test("a double tap fires only double_tap_action", async () => {
    const { circle, actions } = await mountSolar(allActions);

    tap(circle);
    tap(circle);
    circle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    vi.advanceTimersByTime(1000);

    expect(actions()).toEqual(["double_tap"]);
  });

  test("a double tap without double_tap_action fires tap_action for each tap", async () => {
    const { circle, actions } = await mountSolar({ tap_action: { action: "toggle" } });

    tap(circle);
    tap(circle);
    circle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    vi.advanceTimersByTime(1000);

    expect(actions()).toEqual(["tap", "tap"]);
  });

  test("holding for 500 ms fires hold_action and swallows the release tap", async () => {
    const { circle, actions } = await mountSolar(allActions);

    circle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(499);
    expect(actions()).toEqual([]);

    vi.advanceTimersByTime(1);
    circle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    circle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(1000);
    expect(actions()).toEqual(["hold"]);

    tap(circle);
    vi.advanceTimersByTime(250);
    expect(actions()).toEqual(["hold", "tap"]);
  });

  test("releasing or cancelling before 500 ms is not a hold", async () => {
    const { circle, actions } = await mountSolar(allActions);

    circle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(400);
    circle.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    vi.advanceTimersByTime(1000);

    expect(actions()).toEqual([]);
  });

  test("with clickable_entities off the node takes no pointer input", async () => {
    const { circle } = await mountSolar(allActions, { clickable_entities: false });

    expect(circle.classList).toContain("pointer-events-none");
    expect(circle.querySelector("ha-ripple")).toHaveProperty("disabled", true);
  });
});

describe("device-only mode (no grid, solar or battery)", () => {
  const sensors = Array.from({ length: 11 }, (_, index) => `sensor.device_${index + 1}`);
  const watts = [111, 40, 0, 1262, 5, 0, 9, 0, 2, 0, 3];
  const states = {
    "sensor.total": "1524",
    ...Object.fromEntries(sensors.map((sensor, index) => [sensor, String(watts[index])])),
  };
  const config = {
    type: "custom:power-flow-card-plus",
    entities: {
      home: { entity: "sensor.total" },
      individual: sensors.map((entity) => ({ entity })),
    },
  } as PowerFlowCardPlusConfig;

  test("shows every configured device, not only four", async () => {
    const { root } = await renderCard(config, makeHass(states));

    expect(root.querySelectorAll(".orbit-device")).toHaveLength(11);
    expect(root.querySelectorAll(".orbit-line path")).toHaveLength(11);
  });

  test("has no grid, solar, battery or fixed slots", async () => {
    const { root } = await renderCard(config, makeHass(states));

    for (const selector of [
      ".grid",
      ".solar",
      ".battery",
      ".low-carbon",
      ".row",
      ".individual-top",
    ]) {
      expect(root.querySelector(`.circle-container${selector}, ${selector}.row`)).toBeNull();
    }
  });

  test("the home shows the home entity's reading", async () => {
    const { text } = await renderCard(config, makeHass(states));

    expect(text("#home-circle")).toContain(`1.5${thinSpace}kW`);
  });

  test("without a home entity the home shows the sum of the devices", async () => {
    const { text } = await renderCard(
      {
        ...config,
        entities: { individual: sensors.map((entity) => ({ entity })) },
      },
      makeHass(states)
    );

    expect(text("#home-circle")).toContain(`1.4${thinSpace}kW`);
  });

  test("devices at 0 W are shown unless display_zero is false", async () => {
    const { root } = await renderCard(
      {
        ...config,
        entities: {
          home: { entity: "sensor.total" },
          individual: [
            { entity: "sensor.device_4" },
            { entity: "sensor.device_3" },
            { entity: "sensor.device_6", display_zero: false },
          ],
        },
      },
      makeHass(states)
    );

    expect(root.querySelectorAll(".orbit-device")).toHaveLength(2);
  });

  test("only devices that are drawing power get flow dots", async () => {
    const { root } = await renderCard(config, makeHass(states));

    // Seven of the eleven devices read above 0 W.
    expect(root.querySelectorAll("svg.flow-dot")).toHaveLength(7);
  });

  test("a device keeps its colour as the others sort around it", async () => {
    const { root } = await renderCard(config, makeHass(states));

    const colours = [...root.querySelectorAll<HTMLElement>(".orbit-device")].map(
      (node) => /--orbit-color:([^;]+)/.exec(node.getAttribute("style") ?? "")?.[1]
    );
    expect(new Set(colours).size).toBeGreaterThan(4);
    expect(colours.every(Boolean)).toBe(true);
  });

  test("a config with a source keeps the fixed layout", async () => {
    const { root } = await renderCard(
      {
        ...config,
        entities: { ...config.entities, grid: { entity: "sensor.total" } },
      },
      makeHass(states)
    );

    expect(root.querySelector(".orbit")).toBeNull();
    expect(
      root.querySelectorAll(".circle-container.individual-top, .circle-container.individual-bottom")
        .length
    ).toBeLessThanOrEqual(4);
  });

  test("sources disabled in the editor leave empty entities and still give the orbit", async () => {
    const { root } = await renderCard(
      {
        ...config,
        entities: {
          grid: { entity: {}, name: "Rete" },
          solar: { entity: "" },
          battery: {},
          fossil_fuel_percentage: { entity: "", name: "Energia Pulita" },
          home: { entity: "sensor.total" },
          individual: sensors.map((entity) => ({ entity })),
        },
      } as unknown as PowerFlowCardPlusConfig,
      makeHass(states)
    );

    expect(root.querySelectorAll(".orbit-device")).toHaveLength(11);
    expect(root.querySelector(".circle-container.grid")).toBeNull();
  });

  test("renders without NaN while entities are unavailable", async () => {
    const { root } = await renderCard(
      config,
      makeHass({ "sensor.total": "unavailable", "sensor.device_1": "unavailable" })
    );

    expect(root.innerHTML).not.toContain("NaN");
  });
});
