import { describe, expect, test, vi } from "vite-plus/test";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { type Connection } from "home-assistant-js-websocket";
import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { EnergyFlowCardPlus } from "./energy-flow-card-plus";
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
      attributes: { friendly_name: entityId, unit_of_measurement: "Wh" },
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
    callWS: <T>() => Promise.resolve({} as T),
  };
  return hass as HomeAssistant;
}

const thinSpace = "\u2009";

/** Renders the card and waits for its energy period data to load. */
async function renderCard(config: EnergyFlowCardPlusConfig, hass: HomeAssistant) {
  const card = new EnergyFlowCardPlus();
  card.hass = hass;
  card.setConfig(config);
  document.body.append(card);
  await vi.waitFor(() => {
    expect(card.shadowRoot?.querySelector("#energy-flow-card-plus")).not.toBeNull();
  });
  const root = card.shadowRoot!;
  const text = (selector: string) => root.querySelector(selector)?.textContent?.trim();
  return { root, text };
}

describe("render", () => {
  const hass = makeHass();

  test("renders correctly", () => {
    const config = {
      type: "custom:energy-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
      },
    } as EnergyFlowCardPlusConfig;
    const card = new EnergyFlowCardPlus();
    card.hass = hass;
    card.setConfig(config);
    card.connectedCallback();
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("renders while energy stats are unresolved", () => {
    const config = {
      type: "custom:energy-flow-card-plus",
      entities: { grid: { entity: "sensor.grid_energy" } },
    } as EnergyFlowCardPlusConfig;
    const card = new EnergyFlowCardPlus();
    card.hass = hass;
    card.setConfig(config);
    const rendered = card["render"]();
    expect(rendered).toBeTruthy();
  });

  test("accepts collection_key and stores it on the card", () => {
    const config = {
      type: "custom:energy-flow-card-plus",
      collection_key: "energy_living_room",
      entities: { grid: { entity: "sensor.grid_energy" } },
    } as EnergyFlowCardPlusConfig;
    const card = new EnergyFlowCardPlus();
    card.hass = hass;
    card.setConfig(config);
    expect(card["_energyCollectionKey"]).toBe("energy_living_room");
  });
});

const readingHassStates = (config: EnergyFlowCardPlusConfig): EnergyFlowCardPlusConfig => ({
  ...config,
  energy_date_selection: false,
});

describe("rendered values", () => {
  test("grid and solar energy add up on the home", async () => {
    const { text } = await renderCard(
      readingHassStates({
        type: "custom:energy-flow-card-plus",
        entities: {
          grid: { entity: "sensor.grid_energy" },
          solar: { entity: "sensor.solar_energy" },
        },
      } as EnergyFlowCardPlusConfig),
      makeHass({ "sensor.grid_energy": "300", "sensor.solar_energy": "700" })
    );

    expect(text(".grid .consumption")).toBe(`300${thinSpace}Wh`);
    expect(text(".solar .solar")).toBe(`700${thinSpace}Wh`);
    expect(text("#home-circle")).toContain(`1${thinSpace}kWh`);
  });

  test("grid below its zero tolerance shows as 0", async () => {
    const { text } = await renderCard(
      readingHassStates({
        type: "custom:energy-flow-card-plus",
        entities: { grid: { entity: "sensor.grid_energy", display_zero_tolerance: 10 } },
      } as EnergyFlowCardPlusConfig),
      makeHass({ "sensor.grid_energy": "7" })
    );

    expect(text(".grid .consumption")).toBe(`0${thinSpace}Wh`);
  });

  test("unavailable entities render without NaN", async () => {
    const { root } = await renderCard(
      readingHassStates({
        type: "custom:energy-flow-card-plus",
        entities: {
          grid: { entity: "sensor.grid_energy" },
          solar: { entity: "sensor.solar_energy" },
        },
      } as EnergyFlowCardPlusConfig),
      makeHass({ "sensor.grid_energy": "unavailable", "sensor.solar_energy": "unavailable" })
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
    callWS: <T>() => Promise.resolve({} as T),
  };
  return hass as HomeAssistant;
}

const individualTemplates = ["ind0", "ind1", "ind2", "ind3", "ind4", "ind5"];

const templateConfig = {
  type: "custom:energy-flow-card-plus",
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
} as EnergyFlowCardPlusConfig;

describe("secondary info template subscriptions", () => {
  test("every subscribed template is unsubscribed on disconnect", async () => {
    const subscribed: string[] = [];
    const unsubscribed: string[] = [];
    const card = new EnergyFlowCardPlus();
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
