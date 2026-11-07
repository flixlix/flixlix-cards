import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { fakeHass, sensor } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { SortableListCard } from "./sortable-list-card";

const items = [
  { key: "a", name: "Alpha" },
  { key: "b", name: "Bravo" },
  { key: "c", name: "Charlie" },
];

const mountList = (order: string, options: object = {}) => {
  const hass = fakeHass({ states: { "input_text.order": sensor(order, { unit: undefined }) } });
  return mountCard(
    SortableListCard,
    { type: "custom:sortable-list-card", entity: "input_text.order", items, ...options },
    hass
  ).then((mounted) => ({ ...mounted, hass }));
};

const rows = (root: ShadowRoot) =>
  [...root.querySelectorAll(".row")].map((row) => row.textContent?.replace(/\s+/g, " ").trim());

const row = (root: ShadowRoot, key: string) => {
  const element = root.querySelector(`.row[data-key="${key}"]`);
  if (!element) {
    throw new Error(`no row for ${key}`);
  }
  return element;
};

describe("sortable list card", () => {
  test("lists items in the order stored in the entity, ranked", async () => {
    const { root, markup } = await mountList("b,a,c");
    expect(rows(root)).toEqual(["Bravo 1", "Alpha 2", "Charlie 3"]);
    expect(markup()).not.toMatch(/NaN|undefined/);
  });

  test("the down arrow moves an item and saves the new order to the entity", async () => {
    const { root, hass } = await mountList("b,a,c");
    const down = row(root, "b").querySelector("ha-icon-button.down");
    if (!down) {
      throw new Error("no down arrow");
    }
    await userEvent.click(down);
    expect(rows(root)).toEqual(["Alpha 1", "Bravo 2", "Charlie 3"]);
    expect(hass.callService).toHaveBeenCalledExactlyOnceWith(
      "input_text",
      "set_value",
      { entity_id: "input_text.order", value: "a,b,c" },
      undefined
    );
  });

  test("the first item's up arrow is disabled", async () => {
    const { root, hass } = await mountList("b,a,c");
    const up = row(root, "b").querySelector("ha-icon-button.up");
    expect(up).toHaveProperty("disabled", true);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  test("dragging an item onto the top of the list saves it first", async () => {
    const { root, hass } = await mountList("b,a,c");
    await userEvent.dragAndDrop(row(root, "c"), row(root, "b"));
    expect(rows(root)).toEqual(["Charlie 1", "Bravo 2", "Alpha 3"]);
    expect(hass.callService).toHaveBeenCalledExactlyOnceWith(
      "input_text",
      "set_value",
      { entity_id: "input_text.order", value: "c,b,a" },
      undefined
    );
  });

  test("a custom save action receives the order in the configured format", async () => {
    const { root, hass } = await mountList('["a","b","c"]', {
      value_format: "json",
      save_action: {
        service: "script.save_order",
        data: { order: "{value_list}", raw: "{value}" },
      },
    });
    const down = row(root, "a").querySelector("ha-icon-button.down");
    if (!down) {
      throw new Error("no down arrow");
    }
    await userEvent.click(down);
    expect(hass.callService).toHaveBeenCalledExactlyOnceWith(
      "script",
      "save_order",
      { order: ["b", "a", "c"], raw: '["b","a","c"]' },
      undefined
    );
  });

  test("a missing entity is reported and the configured order is shown", async () => {
    const { root, text } = await mountCard(
      SortableListCard,
      { type: "custom:sortable-list-card", entity: "input_text.missing", items },
      fakeHass()
    );
    expect(text(".warning")).toBe("Entity input_text.missing not found.");
    expect(rows(root)).toEqual(["Alpha 1", "Bravo 2", "Charlie 3"]);
  });
});
