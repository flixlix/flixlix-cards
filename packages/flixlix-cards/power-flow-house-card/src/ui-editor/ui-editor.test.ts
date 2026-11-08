import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { describe, expect, test } from "vite-plus/test";
import { type PowerFlowHouseCardConfig } from "../types";
import { PowerFlowHouseCardEditor } from "./ui-editor";

type SchemaField = { name: string; schema?: unknown };

const isSchemaField = (value: unknown): value is SchemaField =>
  typeof value === "object" && value !== null && "name" in value && typeof value.name === "string";

const isGroup = (value: unknown): value is { schema: unknown[] } =>
  typeof value === "object" && value !== null && "schema" in value && Array.isArray(value.schema);

/** Field names of an ha-form schema, with grids and expandable groups flattened into their fields. */
const fieldNames = (schema: unknown): string[] =>
  Array.isArray(schema)
    ? schema.flatMap((field: unknown) => {
        if (isGroup(field)) {
          return fieldNames(field.schema);
        }
        return isSchemaField(field) ? [field.name] : [];
      })
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
  const changes: unknown[] = [];
  editor.addEventListener("config-changed", (event) => {
    changes.push(event instanceof CustomEvent ? event.detail.config : undefined);
  });
  const form = () => editor.shadowRoot?.querySelector("ha-form");
  const formProperty = (name: "schema" | "data"): unknown => {
    const current = form();
    return current && name in current ? Reflect.get(current, name) : undefined;
  };
  return {
    editor,
    changes,
    fields: () => fieldNames(formProperty("schema")),
    data: () => formProperty("data"),
    links: () => [...(editor.shadowRoot?.querySelectorAll("link-subpage") ?? [])],
    open: async (page: string) => {
      editor.shadowRoot
        ?.querySelector(`link-subpage[path="${page}"]`)
        ?.dispatchEvent(new CustomEvent("open-sub-element-editor"));
      await editor.updateComplete;
    },
    change: (value: unknown) =>
      form()?.dispatchEvent(new CustomEvent("value-changed", { detail: { value } })),
  };
};

describe("editor", () => {
  test("the main page holds the title and a link per node, then advanced", async () => {
    const { editor, fields, links } = await mountEditor();

    expect(fields()).toEqual(["title"]);
    expect(links().map((link) => link.getAttribute("path"))).toEqual([
      "grid",
      "solar",
      "battery",
      "home",
      "advanced",
    ]);
    editor.remove();
  });

  test("each node's link says which entity it is set to", async () => {
    const { editor, links } = await mountEditor({
      entities: {
        grid: { entity: { consumption: "sensor.import", production: "sensor.export" } },
        solar: { entity: "sensor.pv" },
      },
    });

    expect(links().map((link) => link.getAttribute("secondary"))).toEqual([
      "sensor.import / sensor.export",
      "sensor.pv",
      "Not configured",
      "Not configured",
      null,
    ]);
    editor.remove();
  });

  test("advanced holds animation, number format and interaction", async () => {
    const { editor, open, fields, data } = await mountEditor();
    await open("advanced");

    expect(fields()).toEqual([
      "animate_numbers",
      "disable_dots",
      "min_flow_rate",
      "max_flow_rate",
      "min_expected_power",
      "max_expected_power",
      "base_decimals",
      "kilo_decimals",
      "kilo_threshold",
      "clickable_entities",
    ]);
    expect(data()).toMatchObject({ animate_numbers: true });
    editor.remove();
  });

  test("the battery page holds its charge colours, showing the defaults", async () => {
    const { editor, open, fields, data } = await mountEditor({
      entities: { battery: { entity: "sensor.battery" } },
    });
    await open("battery");

    expect(fields()).toEqual(expect.arrayContaining(["entity", "red", "yellow"]));
    expect(data()).toMatchObject({ state_of_charge_severity: { red: 15, yellow: 30 } });
    editor.remove();
  });

  test("the default charge colours are not written into the config", async () => {
    const { editor, open, change, changes } = await mountEditor();
    await open("battery");

    change({ entity: "sensor.battery", state_of_charge_severity: { red: 15, yellow: 30 } });
    change({ entity: "sensor.battery", state_of_charge_severity: { red: 10, yellow: 30 } });

    expect(changes).toEqual([
      { type: "custom:power-flow-house-card", entities: { battery: { entity: "sensor.battery" } } },
      {
        type: "custom:power-flow-house-card",
        entities: {
          battery: { entity: "sensor.battery", state_of_charge_severity: { red: 10, yellow: 30 } },
        },
      },
    ]);
    editor.remove();
  });

  test("editing a node's page changes only that node", async () => {
    const { editor, open, change, changes } = await mountEditor({
      entities: { grid: { entity: "sensor.grid" } },
    });
    await open("solar");

    change({ entity: "sensor.pv" });

    expect(changes).toEqual([
      {
        type: "custom:power-flow-house-card",
        entities: { grid: { entity: "sensor.grid" }, solar: { entity: "sensor.pv" } },
      },
    ]);
    editor.remove();
  });
});
