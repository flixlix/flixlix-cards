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

const mountEditor = async (config: Partial<EnergyPeriodSelectorPlusConfig>) => {
  const editor = new EnergyPeriodSelectorPlusEditor();
  editor.hass = fakeHass();
  editor.setConfig({ type: "custom:energy-period-selector-plus", ...config });
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
};

const forms = (editor: EnergyPeriodSelectorPlusEditor) => [
  ...(editor.shadowRoot?.querySelectorAll("ha-form") ?? []),
];

const schemaOf = (form: Element): unknown[] => {
  const schema: unknown = "schema" in form ? form.schema : undefined;
  return Array.isArray(schema) ? schema : [];
};

const dataOf = (form: Element): unknown => ("data" in form ? form.data : undefined);

const editorFields = async (config: Partial<EnergyPeriodSelectorPlusConfig>) => {
  const editor = await mountEditor(config);
  const names = forms(editor).flatMap((form) => fieldNames(schemaOf(form)));
  editor.remove();
  return names;
};

/** custom-card-helpers fires a plain Event with a `detail`, not a CustomEvent. */
const firedConfig = (event: Event): unknown =>
  "detail" in event &&
  typeof event.detail === "object" &&
  event.detail !== null &&
  "config" in event.detail
    ? event.detail.config
    : undefined;

/** Changes a form's data the way ha-form does, and returns the config the editor fires. */
const change = (editor: EnergyPeriodSelectorPlusEditor, form: Element, value: object) => {
  let config: unknown;
  editor.addEventListener("config-changed", (event) => {
    config = firedConfig(event);
  });
  form.dispatchEvent(new CustomEvent("value-changed", { detail: { value }, bubbles: true }));
  return config;
};

const bill = { label: "Bill", duration: { months: 1 }, starts: "2026-01-08" };

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

  test("shows today and compare as in the menu for the older icon style too", async () => {
    const editor = await mountEditor({ today_button_type: "icon", compare_button_type: "icon" });
    const [top] = forms(editor);
    if (!top) {
      throw new Error("no form");
    }

    expect(dataOf(top)).toMatchObject({ today_button_type: "text", compare_button_type: "text" });
    expect(fieldNames(schemaOf(top))).toContain("compare_button_label");
    editor.remove();
  });

  test("lists the user's own periods among the period buttons, by their place", async () => {
    const editor = await mountEditor({ period_buttons: ["day", bill, "month"] });
    const [top] = forms(editor);
    if (!top) {
      throw new Error("no form");
    }

    expect(dataOf(top)).toMatchObject({ period_buttons: ["day", "defined-0", "month"] });
    expect(change(editor, top, { period_buttons: ["defined-0", "month"] })).toMatchObject({
      period_buttons: [bill, "month"],
    });
    editor.remove();
  });

  test("edits a period as label, length, unit and start day", async () => {
    const editor = await mountEditor({ period_buttons: ["day", bill] });
    editor.shadowRoot?.querySelector<HTMLElement>(".definition ha-icon-button")?.click();
    await editor.updateComplete;
    const form = editor.shadowRoot?.querySelector(".definition + ha-form");
    if (!form) {
      throw new Error("no period form");
    }

    expect(dataOf(form)).toEqual({ label: "Bill", count: 1, unit: "months", starts: "2026-01-08" });
    expect(change(editor, form, { label: "Quarter", count: 3, unit: "months" })).toMatchObject({
      period_buttons: ["day", { label: "Quarter", duration: { months: 3 } }],
    });
    editor.remove();
  });

  test("adds a monthly billing period", async () => {
    const editor = await mountEditor({});
    let config: unknown;
    editor.addEventListener("config-changed", (event) => {
      config = firedConfig(event);
    });
    editor.shadowRoot?.querySelector<HTMLElement>(".definitions ha-button")?.click();

    expect(config).toMatchObject({
      period_buttons: [
        "day",
        "week",
        "month",
        "year",
        { label: "Billing", duration: { months: 1 } },
      ],
    });
    editor.remove();
  });
});
