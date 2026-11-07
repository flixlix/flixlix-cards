import { describe, expect, test, vi } from "vite-plus/test";
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
    expect(root.querySelector("#grid-home-flow circle")).toBeNull();
    expect(root.querySelector("#solar-home-flow circle")).not.toBeNull();
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
