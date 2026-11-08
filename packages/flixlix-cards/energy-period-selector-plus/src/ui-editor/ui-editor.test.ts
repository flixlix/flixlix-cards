import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { describe, expect, test } from "vite-plus/test";
import { type EnergyPeriodSelectorPlusConfig } from "../types";
import { EnergyPeriodSelectorPlusEditor } from "./ui-editor";

type SchemaField = { name: string; schema?: unknown };

const isSchemaField = (value: unknown): value is SchemaField =>
  typeof value === "object" && value !== null && "name" in value && typeof value.name === "string";

/** Field names of an ha-form schema, with grids flattened into their fields. */
const fieldNames = (schema: unknown[]): string[] =>
  schema
    .filter(isSchemaField)
    .flatMap((field) => (Array.isArray(field.schema) ? fieldNames(field.schema) : [field.name]));

const editorFields = async (config: Partial<EnergyPeriodSelectorPlusConfig>) => {
  const editor = new EnergyPeriodSelectorPlusEditor();
  editor.hass = fakeHass();
  editor.setConfig({ type: "custom:energy-period-selector-plus", ...config });
  document.body.append(editor);
  await editor.updateComplete;
  const form = editor.shadowRoot?.querySelector("ha-form");
  const schema: unknown = form && "schema" in form ? form.schema : undefined;
  editor.remove();
  return Array.isArray(schema) ? fieldNames(schema) : [];
};

describe("editor", () => {
  test("offers the date picker option next to the other toggles", async () => {
    expect(await editorFields({})).toEqual([
      "title",
      "card_background",
      "prev_next_buttons",
      "date_picker",
      "today_button_type",
      "compare_button_type",
      "period_buttons",
      "collection_key",
    ]);
  });

  test("asks for labels only for the buttons that show them", async () => {
    const fields = await editorFields({
      compare_button_type: "text",
      period_buttons: ["day", "custom"],
    });

    expect(fields).toContain("compare_button_label");
    expect(fields).toContain("custom_period_label");
  });
});
