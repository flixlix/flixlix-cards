import { describe, expect, test } from "vitest";
import { EnergyPeriodSelectorPlus } from "../src/energy-period-selector-plus";
import type { EnergyPeriodSelectorPlusConfig } from "../src/types";

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
      type: "custom:energy-period-selector-plus",
    } as EnergyPeriodSelectorPlusConfig;
    const card = new EnergyPeriodSelectorPlus();
    card.hass = hass;
    card.setConfig(config);
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("renders with all options", () => {
    const config = {
      type: "custom:energy-period-selector-plus",
      vertical_opening_direction: "down",
      opening_direction: "right",
      disable_compare: true,
      collection_key: "test-key",
    } as EnergyPeriodSelectorPlusConfig;
    const card = new EnergyPeriodSelectorPlus();
    card.hass = hass;
    card.setConfig(config);
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("renders with hide_overflow enabled", () => {
    const config = {
      type: "custom:energy-period-selector-plus",
      hide_overflow: true,
    } as EnergyPeriodSelectorPlusConfig;
    const card = new EnergyPeriodSelectorPlus();
    card.hass = hass;
    card.setConfig(config);
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("renders with hide_overflow and disable_compare", () => {
    const config = {
      type: "custom:energy-period-selector-plus",
      hide_overflow: true,
      disable_compare: true,
    } as EnergyPeriodSelectorPlusConfig;
    const card = new EnergyPeriodSelectorPlus();
    card.hass = hass;
    card.setConfig(config);
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });
});
