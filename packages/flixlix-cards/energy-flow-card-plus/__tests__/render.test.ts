// test that the card renders correctly

import { describe, expect, test } from "vitest";

import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { EnergyFlowCardPlus } from "../src/energy-flow-card-plus";

// jsdom does not provide ResizeObserver; stub it so the card's `updated` hook doesn't throw
(globalThis as any).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

type HassState = { state: string; attributes: Record<string, unknown> };

function makeHass(states: Record<string, string> = {}) {
  const hassStates: Record<string, HassState> = {};
  for (const [entityId, state] of Object.entries(states)) {
    hassStates[entityId] = {
      state,
      attributes: { friendly_name: entityId, unit_of_measurement: "Wh" },
    };
  }
  return {
    localize: (key: string) => key,
    locale: { language: "en", number_format: "comma_decimal" },
    states: hassStates,
    config: {},
    user: { name: "test" },
    connection: {},
    callWS: async () => ({}),
  } as any;
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
        secondary: {
          entity?: string;
          has: boolean;
          state: string | number | null;
          unit?: string;
        };
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
  const hass = {
    localize: (key: string) => key,
    states: {},
    locale: {},
    config: {},
    user: { name: "test" },
    connection: {},
    callWS: async () => ({}),
  } as any;

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
    const rendered = (card as unknown as { render: () => any }).render();
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
    expect((card as any)._energyCollectionKey).toBe("energy_living_room");
  });
});

describe("_computeRenderData (energy card)", () => {
  test("case 1: basic grid + solar split with known totals", () => {
    // energy_date_selection: false → reads directly from hass.states (no growthMap needed)
    const config = {
      type: "custom:energy-flow-card-plus",
      energy_date_selection: false,
      entities: {
        grid: { entity: "sensor.grid_energy" },
        solar: { entity: "sensor.solar_energy" },
      },
    } as EnergyFlowCardPlusConfig;
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
    const config = {
      type: "custom:energy-flow-card-plus",
      energy_date_selection: false,
      entities: {
        grid: { entity: "sensor.grid_energy", display_zero_tolerance: 10 } as any,
      },
    } as EnergyFlowCardPlusConfig;
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
    const config = {
      type: "custom:energy-flow-card-plus",
      energy_date_selection: false,
      entities: {
        grid: { entity: "sensor.grid_energy" },
        solar: { entity: "sensor.solar_energy" },
      },
    } as EnergyFlowCardPlusConfig;
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

  test("case 4: battery secondary info exposes its configured entity state", () => {
    const config = {
      type: "custom:energy-flow-card-plus",
      energy_date_selection: false,
      entities: {
        battery: {
          entity: "sensor.battery_energy",
          secondary_info: {
            entity: "sensor.battery_temperature",
            unit_of_measurement: "°C",
          },
        },
      },
    } as EnergyFlowCardPlusConfig;
    const hass = makeHass({
      "sensor.battery_energy": "500",
      "sensor.battery_temperature": "21.5",
    });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.battery.secondary).toMatchObject({
      entity: "sensor.battery_temperature",
      has: true,
      state: 21.5,
      unit: "°C",
    });
  });
});
