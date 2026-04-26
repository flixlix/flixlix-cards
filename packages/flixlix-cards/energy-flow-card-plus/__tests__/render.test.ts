// test that the card renders correctly

import { describe, expect, test } from "vitest";

import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { EnergyFlowCardPlus } from "../src/energy-flow-card-plus";

describe("render", () => {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

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
