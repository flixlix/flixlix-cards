import { type Condition, conditionsMet } from "@flixlix-cards/shared/card-state";
import { type HomeAssistant } from "custom-card-helpers";
import { type Connection, type MessageBase } from "home-assistant-js-websocket";
import { type ReactiveElement } from "lit";
import { describe, expect, test, vi } from "vite-plus/test";
import { ServerConditionsController } from "./server-conditions";

type Subscription = {
  message: MessageBase;
  send: (message: { result: boolean } | { error: string }) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};

/** A websocket connection that subscribes as Home Assistant 2026.10 does, or turns it down. */
const fakeConnection = (refusal?: { code: string; message: string }) => {
  const subscriptions: Subscription[] = [];
  const connection: Pick<Connection, "subscribeMessage"> = {
    subscribeMessage: (callback, message) => {
      if (refusal) {
        return Promise.reject(refusal);
      }
      const unsubscribe = vi.fn(() => Promise.resolve());
      subscriptions.push({ message, send: callback as (result: unknown) => void, unsubscribe });
      return Promise.resolve(unsubscribe);
    },
  };
  return { connection: connection as Connection, subscriptions };
};

const atHome: Condition = { condition: "zone", entity_id: "device_tracker.car", zone: "zone.home" };
const wideScreen: Condition = { condition: "screen", media_query: "(min-width: 768px)" };

const setUp = (connection: Connection, conditions: Condition[]) => {
  const source = { conditions };
  const host: Partial<ReactiveElement> = { addController: () => undefined, requestUpdate: vi.fn() };
  const partialHass: Partial<HomeAssistant> = { connection, states: {} };
  const hass = partialHass as HomeAssistant;
  const controller = new ServerConditionsController(host as ReactiveElement, () => ({
    hass,
    conditions: source.conditions,
  }));
  controller.hostConnected();
  const met = (list: Condition[]) => conditionsMet(list, hass, controller.context);
  return { controller, source, host, met };
};

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("conditions Home Assistant checks", () => {
  test("are subscribed to in the automation format, and hold as Home Assistant says", async () => {
    const { connection, subscriptions } = fakeConnection();
    const not: Condition = { condition: "not", conditions: [atHome] };
    const { met, host } = setUp(connection, [not, wideScreen]);
    expect(subscriptions.map((subscription) => subscription.message)).toEqual([
      {
        type: "subscribe_condition",
        condition: { condition: "not", conditions: [{ condition: "and", conditions: [atHome] }] },
      },
    ]);
    expect(met([not])).toBe(false);
    subscriptions[0]?.send({ result: true });
    expect(met([not])).toBe(true);
    expect(host.requestUpdate).toHaveBeenCalledOnce();
    subscriptions[0]?.send({ error: "zone.home does not exist" });
    expect(met([not])).toBe(false);
  });

  test.each(["unknown_command", "unauthorized"])(
    "before Home Assistant 2026.10 (%s) the card checks them itself",
    async (code) => {
      const { connection } = fakeConnection({ code, message: "" });
      const { met } = setUp(connection, [atHome]);
      await settle();
      expect(met([atHome])).toBe(true);
    }
  );

  test("a condition Home Assistant cannot set up does not hold", async () => {
    const { connection } = fakeConnection({ code: "invalid_format", message: "unknown zone" });
    const { met } = setUp(connection, [atHome]);
    await settle();
    expect(met([atHome])).toBe(false);
  });

  test("a condition the card no longer has, or a card taken off the page, unsubscribes", async () => {
    const { connection, subscriptions } = fakeConnection();
    const { controller, source } = setUp(connection, [atHome]);
    source.conditions = [];
    controller.sync();
    await settle();
    expect(subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();

    source.conditions = [atHome];
    controller.sync();
    controller.hostDisconnected();
    await settle();
    expect(subscriptions[1]?.unsubscribe).toHaveBeenCalledOnce();
  });
});
