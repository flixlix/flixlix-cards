import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type Connection } from "home-assistant-js-websocket";
import { describe, expect, test, vi } from "vite-plus/test";
import { PowerFlowCardPlus } from "../src/power-flow-card-plus";

globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

function makeHass(subscribed: string[], unsubscribed: string[]): HomeAssistant {
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

const config = {
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
    card.setConfig(config);
    card.hass = makeHass(subscribed, unsubscribed);

    document.body.append(card);
    await card.updateComplete;
    expect(subscribed).toEqual(["grid", "solar", "home", "nonFossil", ...individualTemplates]);

    card.remove();
    await vi.waitFor(() => {
      expect(unsubscribed).toEqual(subscribed);
    });
  });
});
