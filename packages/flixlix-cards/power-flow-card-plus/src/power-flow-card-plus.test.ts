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

function makeCard(config: PowerFlowCardPlusConfig, hass: ReturnType<typeof makeHass>) {
  const card = new PowerFlowCardPlus();
  card.setConfig(config);
  card.hass = hass;
  card.connectedCallback();
  return card as unknown as {
    render: () => unknown;
    _computeRenderData: () => ReturnType<typeof computeRenderDataShape>;
  };
}

// Used only as a type reference — actual return shape is inferred from _computeRenderData
declare function computeRenderDataShape(): {
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

describe("_computeRenderData", () => {
  test("case 1: grid-only consumption — fromGrid is the entity value and toHome follows", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
      },
    } as PowerFlowCardPlusConfig;
    const hass = makeHass({ "sensor.grid": "500" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(500);
    // toHome = max(fromGrid - toBattery, 0) = max(500 - 0, 0) = 500
    expect(data.grid.state.toHome).toBe(500);
    // No solar entity configured
    expect(data.solar.has).toBe(false);
    // No battery entity configured → battery.has is falsy
    expect(data.battery.has).toBeFalsy();
  });

  test("case 2: solar covers home and grid is zero — dependency rule zeroes grid toHome", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
      },
    } as PowerFlowCardPlusConfig;
    // grid produces nothing (0W), solar produces 1000W
    const hass = makeHass({ "sensor.grid": "0", "sensor.solar": "1000" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.solar.state.total).toBe(1000);
    // fromGrid === 0 → the dependency rule at lines 791-794 forces toHome and toBattery to 0
    expect(data.grid.state.fromGrid).toBe(0);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(0);
    // Solar covers all home consumption
    expect(data.solar.state.toHome).toBe(1000);
  });

  test("case 3: tolerance zeroing — grid below tolerance is treated as 0", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid", display_zero_tolerance: 5 },
      },
    } as PowerFlowCardPlusConfig;
    // 3W is below the 5W tolerance
    const hass = makeHass({ "sensor.grid": "3" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(0);
    // Dependency rule: fromGrid === 0 → toHome and toBattery also zeroed
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(0);
  });

  test("case 4: negative individual entity stays visible (Plan 001 regression guard)", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        individual: [{ entity: "sensor.device" }],
      },
    } as PowerFlowCardPlusConfig;
    // Individual state is negative; getIndividualState applies Math.abs so state === 50
    const hass = makeHass({ "sensor.grid": "100", "sensor.device": "-50" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.individualObjs).toHaveLength(1);
    const individual = data.individualObjs[0];
    // has === true: the device is visible even with a negative raw state
    expect(individual?.has).toBe(true);
    // getIndividualState returns Math.abs of the raw value
    expect(individual?.state).toBe(50);
  });

  test("case 5: unavailable entity — no NaN in grid state fields", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
      },
    } as PowerFlowCardPlusConfig;
    // "unavailable" is not a number; getEntityState returns null → getEntityStateWatts returns 0
    const hass = makeHass({ "sensor.grid": "unavailable", "sensor.solar": "unavailable" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(Number.isNaN(data.grid.state.fromGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toBattery)).toBe(false);
    expect(Number.isNaN(data.grid.state.toHome)).toBe(false);
    expect(Number.isNaN(data.solar.state.total)).toBe(false);
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
