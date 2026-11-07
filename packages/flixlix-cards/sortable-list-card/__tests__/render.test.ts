import { type HomeAssistant } from "custom-card-helpers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
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

type EntityState = HomeAssistant["states"][string];
type CallService = HomeAssistant["callService"];

function entityState(
  entity_id: string,
  state: string,
  attributes: EntityState["attributes"]
): EntityState {
  return {
    entity_id,
    state,
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", user_id: null, parent_id: null },
  };
}

function makeHass(stateValue = "", callService = vi.fn<CallService>()): HomeAssistant {
  const hass: Partial<HomeAssistant> = {
    localize: (key: string) => key,
    states: {
      "input_text.order": entityState("input_text.order", stateValue, { friendly_name: "Order" }),
      "light.kitchen": entityState("light.kitchen", "on", {
        friendly_name: "Kitchen Light",
        icon: "mdi:lightbulb",
      }),
    },
    callService,
  };
  return hass as HomeAssistant;
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

async function mount(
  config: SortableListCardConfig = baseConfig,
  hass: HomeAssistant = makeHass("battery,ev,heating")
): Promise<SortableListCard> {
  const card = new SortableListCard();
  card.hass = hass;
  card.setConfig({ ...config });
  document.body.append(card);
  await card.updateComplete;
  return card;
}

function rows(card: SortableListCard): HTMLElement[] {
  return [...(card.shadowRoot?.querySelectorAll<HTMLElement>(".row") ?? [])];
}

function rowKeys(card: SortableListCard): (string | undefined)[] {
  return rows(card).map((row) => row.dataset.key);
}

function rowFor(card: SortableListCard, key: string): HTMLElement {
  const found = card.shadowRoot?.querySelector<HTMLElement>(`.row[data-key="${key}"]`);
  if (!found) {
    throw new Error(`no row rendered for "${key}"`);
  }
  return found;
}

async function press(card: SortableListCard, key: string, direction: "up" | "down") {
  rowFor(card, key).querySelector<HTMLElement>(`ha-icon-button.${direction}`)?.click();
  await card.updateComplete;
}

async function setHass(card: SortableListCard, hass: HomeAssistant) {
  card.hass = hass;
  await card.updateComplete;
}

async function startDrag(card: SortableListCard, key: string) {
  rowFor(card, key).dispatchEvent(new Event("dragstart"));
  await card.updateComplete;
}

async function dragOver(card: SortableListCard, key: string, half: "top" | "bottom") {
  const target = rowFor(card, key);
  const rect = target.getBoundingClientRect();
  const clientY = half === "top" ? rect.top : rect.top + rect.height + 1;
  target.dispatchEvent(new MouseEvent("dragover", { clientY, cancelable: true }));
  await card.updateComplete;
}

async function endDrag(card: SortableListCard, key: string) {
  rowFor(card, key).dispatchEvent(new Event("dragend"));
  await card.updateComplete;
}

function isAnimating(card: SortableListCard): boolean {
  return card.shadowRoot?.querySelector(".list")?.classList.contains("animating") ?? false;
}

describe("sortable-list-card", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  test("setConfig throws when items is not a list", () => {
    const card = new SortableListCard();
    const config: Partial<SortableListCardConfig> = { type: "custom:sortable-list-card" };
    expect(() => card.setConfig(config as SortableListCardConfig)).toThrow(
      "`items` must be a list"
    );
  });

  test("setConfig applies display defaults", async () => {
    const card = await mount();
    const first = rowFor(card, "battery");
    expect(first.querySelector(".handle")).not.toBeNull();
    expect(first.querySelector(".arrows")).not.toBeNull();
    expect(first.querySelector(".rank")?.textContent).toBe("1");
    expect(first.querySelector(".secondary")).toBeNull();
  });

  test("setConfig seeds order from configured items", async () => {
    const card = await mount(baseConfig, makeHass());
    expect(rowKeys(card)).toEqual(["battery", "ev", "heating"]);
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

  test("renders a row per item in the stored order", async () => {
    const card = await mount(baseConfig, makeHass("heating,battery,ev"));
    expect(rowKeys(card)).toEqual(["heating", "battery", "ev"]);
    expect(rowFor(card, "heating").querySelector(".name")?.textContent).toBe("Heating");
  });

  test("renders an empty state when no resolvable items", async () => {
    const card = await mount({ ...baseConfig, items: [] });
    expect(rows(card)).toHaveLength(0);
    expect(card.shadowRoot?.querySelector(".empty")).not.toBeNull();
  });

  test("moving a row reorders and commits the new value to the entity", async () => {
    const callService = vi.fn<CallService>();
    const card = await mount(baseConfig, makeHass("battery,ev,heating", callService));

    await press(card, "battery", "down");

    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);
    expect(callService).toHaveBeenCalledWith(
      "input_text",
      "set_value",
      { entity_id: "input_text.order", value: "ev,battery,heating" },
      undefined
    );
  });

  test("moving past the boundaries is a no-op", async () => {
    const callService = vi.fn<CallService>();
    const card = await mount(baseConfig, makeHass("battery,ev,heating", callService));

    await press(card, "battery", "up");
    await press(card, "heating", "down");

    expect(rowKeys(card)).toEqual(["battery", "ev", "heating"]);
    expect(callService).not.toHaveBeenCalled();
  });

  test("dropping a dragged row inserts it at the drop position", async () => {
    const callService = vi.fn<CallService>();
    const card = await mount(baseConfig, makeHass("battery,ev,heating", callService));

    await startDrag(card, "battery");
    await dragOver(card, "heating", "bottom");
    await endDrag(card, "battery");

    expect(rowKeys(card)).toEqual(["ev", "heating", "battery"]);
    expect(callService).toHaveBeenCalledTimes(1);
  });

  test("dropping a row onto its own position does not commit", async () => {
    const callService = vi.fn<CallService>();
    const card = await mount(baseConfig, makeHass("battery,ev,heating", callService));

    await startDrag(card, "ev");
    await dragOver(card, "heating", "top");
    await endDrag(card, "ev");

    expect(rowKeys(card)).toEqual(["battery", "ev", "heating"]);
    expect(callService).not.toHaveBeenCalled();
  });

  test("adopting the entity order on first render never flags animating", async () => {
    const card = await mount(baseConfig, makeHass("heating,ev,battery"));

    expect(rowKeys(card)).toEqual(["heating", "ev", "battery"]);
    expect(isAnimating(card)).toBe(false);
  });

  test("commits via a custom save_action service", async () => {
    const callService = vi.fn<CallService>();
    const card = await mount(
      {
        ...baseConfig,
        entity: undefined,
        save_action: { service: "script.persist", data: { order: "{value_list}" } },
      },
      makeHass("battery,ev,heating", callService)
    );

    await press(card, "battery", "down");

    expect(callService).toHaveBeenCalledWith(
      "script",
      "persist",
      { order: ["ev", "battery", "heating"] },
      undefined
    );
  });

  test("optimistic pending value is not overwritten by stale state", async () => {
    const card = await mount();

    await press(card, "battery", "down");
    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);

    await setHass(card, makeHass("battery,ev,heating"));
    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);

    // The entity catching up confirms the pending value, so later changes are adopted again.
    await setHass(card, makeHass("ev,battery,heating"));
    await setHass(card, makeHass("heating,ev,battery"));
    expect(rowKeys(card)).toEqual(["heating", "ev", "battery"]);
  });

  test("does not reconcile order while dragging", async () => {
    const card = await mount();

    await startDrag(card, "battery");
    await setHass(card, makeHass("heating,ev,battery"));

    expect(rowKeys(card)).toEqual(["battery", "ev", "heating"]);
  });

  test("adopts external entity changes", async () => {
    const card = await mount();

    await setHass(card, makeHass("heating,battery,ev"));

    expect(rowKeys(card)).toEqual(["heating", "battery", "ev"]);
  });

  test("without an entity the order stays local and is not reconciled", async () => {
    const card = await mount(
      {
        ...baseConfig,
        entity: undefined,
        save_action: { service: "script.persist", data: { order: "{value_csv}" } },
      },
      makeHass("", vi.fn<CallService>())
    );

    await press(card, "battery", "down");
    await setHass(card, makeHass("heating,battery,ev"));

    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);
  });
});

describe("sortable-list-card FLIP animations", () => {
  let animations: { cancel: ReturnType<typeof vi.fn> }[];
  let animateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    animations = [];
    animateMock = vi.fn(() => {
      const anim = { cancel: vi.fn(), finished: Promise.resolve() };
      animations.push(anim);
      return anim;
    });
    // jsdom does not implement the Web Animations API.
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animateMock,
    });

    // jsdom has no layout, so derive each row's top from its sibling index.
    // Reordering then yields non-zero FLIP deltas for the rows that moved.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      const parent = this.parentElement;
      const idx = parent ? Array.prototype.indexOf.call(parent.children, this) : 0;
      return { top: idx * 50, height: 50, bottom: idx * 50 + 50 } as DOMRect;
    });

    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    document.body.replaceChildren();
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  test("animates only the rows whose position changed", async () => {
    const card = await mount();

    await press(card, "battery", "down");

    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);
    // battery and ev swap; heating stays put, so only two rows animate.
    expect(animateMock).toHaveBeenCalledTimes(2);
  });

  test("flags the list as animating during the move and clears it after the duration", async () => {
    vi.useFakeTimers();
    const card = await mount();

    await press(card, "battery", "down");
    expect(isAnimating(card)).toBe(true);

    vi.advanceTimersByTime(200);
    await card.updateComplete;
    expect(isAnimating(card)).toBe(false);
  });

  test("respects prefers-reduced-motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const card = await mount();

    await press(card, "battery", "down");
    await card.updateComplete;

    expect(rowKeys(card)).toEqual(["ev", "battery", "heating"]);
    expect(animateMock).not.toHaveBeenCalled();
    expect(isAnimating(card)).toBe(false);
  });

  test("cancels in-flight slides before measuring the next move", async () => {
    const card = await mount();

    await press(card, "battery", "down");
    const firstBatch = animations.slice();
    expect(firstBatch.length).toBe(2);

    // A second move while the first slide is still "running" must cancel it,
    // so deltas are measured from real layout instead of a transformed position.
    await press(card, "ev", "down");

    firstBatch.forEach((anim) => expect(anim.cancel).toHaveBeenCalled());
  });

  test("disconnecting cancels any running slide animations", async () => {
    const card = await mount();

    await press(card, "battery", "down");
    const batch = animations.slice();
    expect(batch.length).toBeGreaterThan(0);

    card.remove();
    batch.forEach((anim) => expect(anim.cancel).toHaveBeenCalled());
  });

  test("no drop indicator renders on positions adjacent to the dragged row", async () => {
    const card = await mount();
    await startDrag(card, "battery");

    // Dropping right before itself (own index) is a no-op → no indicator.
    await dragOver(card, "battery", "top");
    expect(rowFor(card, "battery").classList.contains("drop-before")).toBe(false);

    // Dropping right after itself (own index + 1) is also a no-op → no indicator.
    await dragOver(card, "ev", "top");
    expect(rowFor(card, "ev").classList.contains("drop-before")).toBe(false);

    // A real target still shows the indicator.
    await dragOver(card, "heating", "top");
    expect(rowFor(card, "heating").classList.contains("drop-before")).toBe(true);
  });
});
