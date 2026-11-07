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

function makeCard(config: EnergyFlowCardPlusConfig, hass: ReturnType<typeof makeHass>) {
  const card = new EnergyFlowCardPlus();
  card.hass = hass;
  card.setConfig(config);
  card.connectedCallback();
  return card as unknown as {
    render: () => unknown;
    _computeRenderData: () => {
      grid: {
        has: boolean;
        state: {
          fromGrid: number | null;
          toGrid: number | null;
          toBattery: number | null;
          toHome: number | null;
        };
      };
      solar: {
        has: boolean;
        state: {
          total: number | null;
          toHome: number | null;
          toGrid: number | null;
          toBattery: number | null;
        };
      };
      battery: {
        has: boolean | string;
        state: {
          fromBattery: number | null;
          toBattery: number | null;
          toGrid: number | null;
          toHome: number | null;
        };
      };
      individualObjs: Array<{ has: boolean; state: number | null }>;
    };
  };
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

describe("_computeRenderData (energy card)", () => {
  test("case 1: basic grid + solar split with known totals", () => {
    // energy_date_selection: false → reads directly from hass.states (no growthMap needed)
    const config = readingHassStates({
      type: "custom:energy-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_energy" },
        solar: { entity: "sensor.solar_energy" },
      },
    } as EnergyFlowCardPlusConfig);
    const hass = makeHass({
      "sensor.grid_energy": "300",
      "sensor.solar_energy": "700",
    });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    // Grid string entity → fromGrid uses getEnergyEntityStateLocal(entity), toGrid = 0
    expect(data.grid.state.fromGrid).toBe(300);
    expect(data.grid.state.toGrid).toBe(0);
    // Solar total
    expect(data.solar.state.total).toBe(700);
    // Solar covers home: toHome = total - toGrid - toBattery = 700 - 0 - 0 = 700
    expect(data.solar.state.toHome).toBe(700);
    // Grid toHome = max(fromGrid - toBattery, 0) = max(300 - 0, 0) = 300
    expect(data.grid.state.toHome).toBe(300);
  });

  test("case 2: tolerance zeroing via adjustZeroTolerance — grid below tolerance is zeroed", () => {
    const config = readingHassStates({
      type: "custom:energy-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_energy", display_zero_tolerance: 10 },
      },
    } as EnergyFlowCardPlusConfig);
    // 7Wh is below the 10Wh tolerance
    const hass = makeHass({ "sensor.grid_energy": "7" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(0);
    // Dependency rule: fromGrid === 0 → toHome and toBattery also 0
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(0);
  });

  test("case 3: no-NaN guarantee — unavailable entity produces only numeric output", () => {
    const config = readingHassStates({
      type: "custom:energy-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_energy" },
        solar: { entity: "sensor.solar_energy" },
      },
    } as EnergyFlowCardPlusConfig);
    // Neither entity has a numeric state; growthMap not involved (energy_date_selection: false)
    // getEntityState returns null → getEntityStateWh returns 0
    const hass = makeHass({
      "sensor.grid_energy": "unavailable",
      "sensor.solar_energy": "unavailable",
    });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(Number.isNaN(data.grid.state.fromGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toBattery)).toBe(false);
    expect(Number.isNaN(data.grid.state.toHome)).toBe(false);
    expect(Number.isNaN(data.solar.state.total)).toBe(false);
    expect(Number.isNaN(data.solar.state.toHome)).toBe(false);
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
