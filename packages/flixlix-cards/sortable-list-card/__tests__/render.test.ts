import { describe, expect, test, vi } from "vitest";
import { SortableListCard } from "../src/sortable-list-card";
import { type SortableListCardConfig } from "../src/types";
import {
  buildSaveCall,
  configKeys,
  formatOrder,
  parseStateValue,
  reconcileOrder,
  resolveItems,
  resolveOrder,
} from "../src/utils";

function makeHass(stateValue = "", callService = vi.fn()) {
  return {
    localize: (key: string) => key,
    locale: { language: "en", number_format: "comma_decimal" },
    states: {
      "input_text.order": {
        state: stateValue,
        attributes: { friendly_name: "Order" },
      },
      "light.kitchen": {
        state: "on",
        attributes: { friendly_name: "Kitchen Light", icon: "mdi:lightbulb" },
      },
    },
    callService,
    config: {},
  } as any;
}

const baseConfig: SortableListCardConfig = {
  type: "custom:sortable-list-card",
  entity: "input_text.order",
  items: [
    { key: "battery", name: "Battery", icon: "mdi:battery" },
    { key: "ev", name: "EV", icon: "mdi:car-electric" },
    { key: "heating", name: "Heating", icon: "mdi:radiator" },
  ],
};

describe("sortable-list-card utils", () => {
  test("configKeys uses key, falling back to entity", () => {
    expect(
      configKeys({
        ...baseConfig,
        items: [{ key: "a" }, { entity: "light.kitchen" }, {}],
      })
    ).toEqual(["a", "light.kitchen"]);
  });

  test("reconcileOrder keeps stored order then appends missing keys", () => {
    expect(reconcileOrder(["battery", "ev", "heating"], ["heating", "battery"])).toEqual([
      "heating",
      "battery",
      "ev",
    ]);
  });

  test("reconcileOrder drops keys no longer configured", () => {
    expect(reconcileOrder(["battery", "ev"], ["ev", "ghost", "battery"])).toEqual([
      "ev",
      "battery",
    ]);
  });

  test("parseStateValue handles csv and json", () => {
    expect(parseStateValue(" a , b ,, c ")).toEqual(["a", "b", "c"]);
    expect(parseStateValue('["a","b","c"]', "json")).toEqual(["a", "b", "c"]);
    expect(parseStateValue("not json", "json")).toEqual(["not json"]);
    expect(parseStateValue("")).toEqual([]);
    expect(parseStateValue(undefined)).toEqual([]);
  });

  test("formatOrder serializes per format", () => {
    expect(formatOrder(["a", "b"])).toBe("a,b");
    expect(formatOrder(["a", "b"], "json")).toBe('["a","b"]');
  });

  test("resolveOrder reconciles config against a state value", () => {
    expect(resolveOrder(baseConfig, "ev,heating,battery")).toEqual(["ev", "heating", "battery"]);
    expect(resolveOrder({ ...baseConfig, value_format: "json" }, '["ev","battery"]')).toEqual([
      "ev",
      "battery",
      "heating",
    ]);
  });

  test("resolveItems pulls name/icon/state from entities with overrides", () => {
    const items = resolveItems(makeHass(), {
      ...baseConfig,
      show_state: true,
      items: [
        { entity: "light.kitchen" },
        { entity: "light.kitchen", key: "k2", name: "Custom", icon: "mdi:star" },
        { key: "manual", name: "Manual" },
      ],
    });
    expect(items[0]).toMatchObject({
      key: "light.kitchen",
      name: "Kitchen Light",
      icon: "mdi:lightbulb",
      state: "on",
    });
    expect(items[1]).toMatchObject({ key: "k2", name: "Custom", icon: "mdi:star" });
    expect(items[2]).toMatchObject({ key: "manual", name: "Manual" });
    expect(items[2]?.icon).toBeUndefined();
  });

  test("buildSaveCall defaults to input_text.set_value on the entity", () => {
    const call = buildSaveCall(baseConfig, ["ev", "battery", "heating"]);
    expect(call).toEqual({
      domain: "input_text",
      service: "set_value",
      serviceData: { entity_id: "input_text.order", value: "ev,battery,heating" },
      target: undefined,
    });
  });

  test("buildSaveCall substitutes placeholders in a custom service", () => {
    const call = buildSaveCall(
      {
        ...baseConfig,
        save_action: {
          service: "script.save_order",
          data: { csv: "{value_csv}", json: "{value_json}", list: "{value_list}" },
          target: { entity_id: "script.save_order" },
        },
      },
      ["a", "b"]
    );
    expect(call).toEqual({
      domain: "script",
      service: "save_order",
      serviceData: { csv: "a,b", json: '["a","b"]', list: ["a", "b"] },
      target: { entity_id: "script.save_order" },
    });
  });

  test("buildSaveCall honors json value_format for {value}", () => {
    const call = buildSaveCall(
      { ...baseConfig, value_format: "json", save_action: { service: "input_text.set_value" } },
      ["a", "b"]
    );
    expect(call?.serviceData).toBeUndefined();
  });

  test("buildSaveCall returns null when no entity and no save_action", () => {
    expect(buildSaveCall({ ...baseConfig, entity: undefined }, ["a"])).toBeNull();
  });
});

describe("sortable-list-card", () => {
  test("setConfig throws when items is not a list", () => {
    const card = new SortableListCard();
    expect(() => card.setConfig({ type: "custom:sortable-list-card" } as any)).toThrow();
  });

  test("setConfig applies display defaults", () => {
    const card = new SortableListCard();
    card.setConfig({ ...baseConfig });
    const cfg = (card as any)._config as SortableListCardConfig;
    expect(cfg.show_handle).toBe(true);
    expect(cfg.show_arrows).toBe(true);
    expect(cfg.show_rank).toBe(true);
    expect(cfg.show_state).toBe(false);
  });

  test("setConfig seeds order from configured items", () => {
    const card = new SortableListCard();
    card.setConfig({ ...baseConfig });
    expect((card as any)._order).toEqual(["battery", "ev", "heating"]);
  });

  test("getStubConfig returns a valid, settable config", () => {
    const stub = SortableListCard.getStubConfig(makeHass());
    expect(stub.entity).toBe("input_text.order");
    expect(stub.items.length).toBeGreaterThan(0);
    const card = new SortableListCard();
    expect(() => card.setConfig(stub)).not.toThrow();
  });

  test("getCardSize scales with item count", () => {
    const card = new SortableListCard();
    card.setConfig({ ...baseConfig });
    expect(card.getCardSize()).toBe(4);
  });

  test("renders with a valid config", () => {
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating");
    card.setConfig({ ...baseConfig });
    expect((card as any).render()).toBeTruthy();
  });

  test("renders an empty state when no resolvable items", () => {
    const card = new SortableListCard();
    card.hass = makeHass();
    card.setConfig({ ...baseConfig, items: [] });
    expect((card as any).render()).toBeTruthy();
  });

  test("_move reorders and commits the new value to the entity", () => {
    const callService = vi.fn();
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating", callService);
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];

    (card as any)._move(0, 1);

    expect((card as any)._order).toEqual(["ev", "battery", "heating"]);
    expect(callService).toHaveBeenCalledWith(
      "input_text",
      "set_value",
      { entity_id: "input_text.order", value: "ev,battery,heating" },
      undefined
    );
  });

  test("_move is a no-op at the boundaries", () => {
    const callService = vi.fn();
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating", callService);
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];

    (card as any)._move(0, -1);
    (card as any)._move(2, 3);

    expect((card as any)._order).toEqual(["battery", "ev", "heating"]);
    expect(callService).not.toHaveBeenCalled();
  });

  test("_moveTo uses drag insertion semantics", () => {
    const callService = vi.fn();
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating", callService);
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];

    (card as any)._moveTo(0, 3);

    expect((card as any)._order).toEqual(["ev", "heating", "battery"]);
    expect(callService).toHaveBeenCalledTimes(1);
  });

  test("commits via a custom save_action service", () => {
    const callService = vi.fn();
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating", callService);
    card.setConfig({
      ...baseConfig,
      entity: undefined,
      save_action: { service: "script.persist", data: { order: "{value_list}" } },
    });
    (card as any)._order = ["battery", "ev", "heating"];

    (card as any)._move(0, 1);

    expect(callService).toHaveBeenCalledWith(
      "script",
      "persist",
      { order: ["ev", "battery", "heating"] },
      undefined
    );
  });

  test("optimistic pending value is not overwritten by stale state", () => {
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating");
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];

    (card as any)._move(0, 1);
    expect((card as any)._pending).toBe("ev,battery,heating");

    card.hass = makeHass("battery,ev,heating");
    (card as any)._syncFromState();
    expect((card as any)._order).toEqual(["ev", "battery", "heating"]);
    expect((card as any)._pending).toBe("ev,battery,heating");

    card.hass = makeHass("ev,battery,heating");
    (card as any)._syncFromState();
    expect((card as any)._pending).toBeNull();
  });

  test("does not reconcile order while dragging", () => {
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating");
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];
    (card as any)._dragging = true;

    card.hass = makeHass("heating,ev,battery");
    (card as any)._syncFromState();
    expect((card as any)._order).toEqual(["battery", "ev", "heating"]);
  });

  test("syncFromState adopts external entity changes", () => {
    const card = new SortableListCard();
    card.hass = makeHass("battery,ev,heating");
    card.setConfig({ ...baseConfig });
    (card as any)._order = ["battery", "ev", "heating"];

    card.hass = makeHass("heating,battery,ev");
    (card as any)._syncFromState();
    expect((card as any)._order).toEqual(["heating", "battery", "ev"]);
  });

  test("without an entity the order stays local and is not reconciled", () => {
    const callService = vi.fn();
    const card = new SortableListCard();
    card.hass = makeHass("", callService);
    card.setConfig({
      ...baseConfig,
      entity: undefined,
      save_action: { service: "script.persist", data: { order: "{value_csv}" } },
    });
    (card as any)._order = ["ev", "battery", "heating"];

    (card as any)._syncFromState();
    expect((card as any)._order).toEqual(["ev", "battery", "heating"]);
  });
});
