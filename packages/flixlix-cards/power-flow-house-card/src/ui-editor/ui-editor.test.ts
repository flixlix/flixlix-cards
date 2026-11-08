import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { describe, expect, test } from "vite-plus/test";
import { type PowerFlowHouseCardConfig } from "../types";
import { PowerFlowHouseCardEditor } from "./ui-editor";

type SchemaField = { name: string; schema?: unknown };

const isSchemaField = (value: unknown): value is SchemaField =>
  typeof value === "object" && value !== null && "name" in value && typeof value.name === "string";

/** Field names of an ha-form schema, with grids flattened into their fields. */
const fieldNames = (schema: unknown): string[] =>
  Array.isArray(schema)
    ? schema
        .filter(isSchemaField)
        .flatMap((field) => (Array.isArray(field.schema) ? fieldNames(field.schema) : [field.name]))
    : [];

const mountEditor = async (config: Record<string, unknown> = {}) => {
  const editor = new PowerFlowHouseCardEditor();
  editor.hass = fakeHass();
  editor.setConfig({
    type: "custom:power-flow-house-card",
    entities: {},
    ...config,
  } as PowerFlowHouseCardConfig);
  document.body.append(editor);
  await editor.updateComplete;
  const form = () => editor.shadowRoot?.querySelector("ha-form");
  return { editor, form };
};

/** The values the editor's main form shows for a config. */
const formData = async (config: Record<string, unknown>) => {
  const { editor, form } = await mountEditor(config);
  const current = form();
  const value: unknown = current && "data" in current ? current.data : undefined;
  editor.remove();
  return value;
};

describe("editor", () => {
  test("offers the card's options, animate_numbers among them", async () => {
    const { editor, form } = await mountEditor();
    const current = form();
    const schema: unknown = current && "schema" in current ? current.schema : undefined;

    expect(fieldNames(schema)).toEqual([
      "title",
      "animate_numbers",
      "clickable_entities",
      "disable_dots",
      "base_decimals",
      "kilo_decimals",
      "kilo_threshold",
    ]);
    editor.remove();
  });

  test("shows numbers animated until the user turns it off", async () => {
    expect(await formData({})).toMatchObject({ animate_numbers: true });
    expect(await formData({ animate_numbers: false })).toMatchObject({ animate_numbers: false });
  });

  test("links to a page per node", async () => {
    const { editor } = await mountEditor();
    const pages = [...(editor.shadowRoot?.querySelectorAll("link-subpage") ?? [])].map((link) =>
      link.getAttribute("path")
    );

    expect(pages).toEqual(["grid", "solar", "battery", "fossil_fuel_percentage", "home"]);
    editor.remove();
  });

  test("editing a node's page changes only that node", async () => {
    const { editor } = await mountEditor({ entities: { grid: { entity: "sensor.grid" } } });
    const changes: unknown[] = [];
    editor.addEventListener("config-changed", (event) => {
      changes.push(event instanceof CustomEvent ? event.detail : undefined);
    });
    editor.shadowRoot
      ?.querySelector('link-subpage[path="solar"]')
      ?.dispatchEvent(new CustomEvent("open-sub-element-editor"));
    await editor.updateComplete;

    editor.shadowRoot
      ?.querySelector("ha-form")
      ?.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: { entity: "sensor.pv" } } })
      );

    expect(changes).toEqual([
      {
        config: {
          type: "custom:power-flow-house-card",
          entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.pv" } },
        },
      },
    ]);
    editor.remove();
  });
});
