// @vitest-environment jsdom

import { batteryElement } from "@flixlix-cards/shared/components/battery";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { render } from "lit";
import { describe, expect, test } from "vitest";

const config = {
  type: "custom:power-flow-card-plus",
  clickable_entities: true,
  entities: {
    battery: {
      entity: "sensor.battery_power",
      state_of_charge: "sensor.battery_soc",
      secondary_info: {
        entity: "sensor.battery_voltage",
        unit_of_measurement: "V",
      },
    },
  },
} as FlowCardPlusConfig;

const main = {
  hass: {
    locale: { language: "en", number_format: "comma_decimal" },
    states: {},
  },
  onEntityClick: () => undefined,
  onEntityDoubleClick: () => undefined,
  onEntityPointerDown: () => undefined,
  onEntityPointerUp: () => undefined,
  openDetails: () => undefined,
} as unknown as CardMainContext;

const templatesObj: TemplatesObj = {
  batterySecondary: undefined,
  gridSecondary: undefined,
  solarSecondary: undefined,
  homeSecondary: undefined,
  individual: [],
  nonFossilFuelSecondary: undefined,
};

const battery = {
  icon: "mdi:battery-high",
  name: "Battery",
  state_of_charge: {
    state: 75,
    unit: "%",
    unit_white_space: false,
    decimals: 0,
  },
  secondary: {
    entity: "sensor.battery_voltage",
    has: true,
    template: undefined,
    state: 240,
    icon: undefined,
    unit: "V",
    unit_white_space: false,
    decimals: 0,
    accept_negative: false,
  },
  state: {
    toBattery: 0,
    fromBattery: 500,
  },
  unit: "W",
  unit_white_space: false,
  decimals: 0,
};

describe("batteryElement", () => {
  test("renders secondary info together with state of charge", () => {
    const container = document.createElement("div");

    render(
      batteryElement(main, config, {
        battery,
        entities: config.entities,
        templatesObj,
      }),
      container
    );

    expect(container.querySelector("#battery-state-of-charge-text")?.textContent?.trim()).toBe(
      "75%"
    );
    expect(container.querySelector(".battery span.secondary-info")?.textContent?.trim()).toBe(
      "240V"
    );
  });

  test("renders a battery secondary template without an entity state", () => {
    const container = document.createElement("div");

    render(
      batteryElement(main, config, {
        battery: {
          ...battery,
          secondary: {
            ...battery.secondary,
            entity: undefined,
            has: false,
            template: "configured template",
            state: null,
          },
        },
        entities: config.entities,
        templatesObj: {
          ...templatesObj,
          batterySecondary: "240V / 60Hz",
        },
      }),
      container
    );

    expect(container.querySelector(".battery span.secondary-info")?.textContent?.trim()).toBe(
      "240V / 60Hz"
    );
  });
});
