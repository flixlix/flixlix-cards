import { fakeHass, sensor, type StateFixtures } from "@flixlix-cards/shared/testing/fake-hass";
import { describe, expect, test } from "vite-plus/test";
import { type HomeFlowCardConfig } from "../types";
import { HomeFlowCardEditor } from "./ui-editor";

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

/** The top-level fields of a schema, groups left as they are. */
const topLevel = (schema: unknown): string[] =>
  Array.isArray(schema)
    ? schema.map((field: unknown) => {
        if (isSchemaField(field) && field.name !== "") {
          return field.name;
        }
        return isGroup(field) ? "(group)" : "?";
      })
    : [];

const mountEditor = async (config: Record<string, unknown> = {}, states: StateFixtures = {}) => {
  const editor = new HomeFlowCardEditor();
  editor.hass = fakeHass({ states });
  editor.setConfig({ type: "custom:home-flow-card", ...config } as HomeFlowCardConfig);
  document.body.append(editor);
  await editor.updateComplete;
  const changes: unknown[] = [];
  editor.addEventListener("config-changed", (event) => {
    changes.push(event instanceof CustomEvent ? event.detail.config : undefined);
  });
  const form = () => editor.shadowRoot?.querySelector("ha-form");
  const formProperty = (name: string): unknown => {
    const current = form();
    return current && name in current ? Reflect.get(current, name) : undefined;
  };
  return {
    editor,
    changes,
    schema: () => formProperty("schema"),
    fields: () => fieldNames(formProperty("schema")),
    data: () => formProperty("data"),
    helper: (name: string): unknown => {
      const compute = formProperty("computeHelper");
      return typeof compute === "function" ? compute({ name }) : undefined;
    },
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
      "generator",
      "home",
      "advanced",
    ]);
    editor.remove();
  });

  test("each node's link shows its entities and their live readings", async () => {
    const { editor, links } = await mountEditor(
      {
        grid: { entity: { consumption: "sensor.import", production: "sensor.export" } },
        solar: { entity: "sensor.pv" },
        battery: { entity: "sensor.battery", state_of_charge: "sensor.soc" },
      },
      {
        "sensor.import": "250",
        "sensor.export": "0",
        "sensor.pv": "1200",
        "sensor.battery": "-800",
        "sensor.soc": sensor("55", { unit: "%" }),
      }
    );

    expect(links().map((link) => link.getAttribute("secondary"))).toEqual([
      "sensor.import / sensor.export · 250 W · 0 W",
      "sensor.pv · 1,200 W",
      "sensor.battery · -800 W · 55 %",
      "Not configured",
      "Not configured",
      null,
    ]);
    editor.remove();
  });

  test("a node page starts with its entity and folds the rarely needed fields away", async () => {
    const { editor, open, schema } = await mountEditor({ battery: { entity: "sensor.battery" } });
    await open("battery");

    expect(topLevel(schema())).toEqual([
      "entity",
      "entity",
      "state_of_charge",
      "(group)",
      "state_of_charge_severity",
      "(group)",
    ]);
    editor.remove();
  });

  test("node pages leave out what this card does not draw", async () => {
    const { editor, open, fields } = await mountEditor({ grid: { entity: "sensor.grid" } });
    await open("grid");

    expect(fields()).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(color_icon|color_circle|display_state)$/)])
    );
    expect(fields()).toEqual(
      expect.arrayContaining(["entity", "name", "state_alert", "label_alert", "decimals"])
    );
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

  test("a number field says what it falls back to when left empty", async () => {
    const { editor, open, helper } = await mountEditor();
    await open("advanced");

    expect(helper("kilo_threshold")).toBe("Default: 1000 W");
    expect(helper("animate_numbers")).toBeUndefined();
    editor.remove();
  });

  test("the battery page shows the default charge colours", async () => {
    const { editor, open, data } = await mountEditor({ battery: { entity: "sensor.battery" } });
    await open("battery");

    expect(data()).toMatchObject({ state_of_charge_severity: { red: 15, yellow: 30 } });
    editor.remove();
  });

  test("the default charge colours are not written into the config", async () => {
    const { editor, open, change, changes } = await mountEditor();
    await open("battery");

    change({ entity: "sensor.battery", state_of_charge_severity: { red: 15, yellow: 30 } });
    change({ entity: "sensor.battery", state_of_charge_severity: { red: 10, yellow: 30 } });

    expect(changes).toEqual([
      { type: "custom:home-flow-card", battery: { entity: "sensor.battery" } },
      {
        type: "custom:home-flow-card",
        battery: { entity: "sensor.battery", state_of_charge_severity: { red: 10, yellow: 30 } },
      },
    ]);
    editor.remove();
  });

  test("editing a node's page changes only that node, at the top level", async () => {
    const { editor, open, change, changes } = await mountEditor({
      grid: { entity: "sensor.grid" },
    });
    await open("solar");

    change({ entity: "sensor.pv" });

    expect(changes).toEqual([
      {
        type: "custom:home-flow-card",
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.pv" },
      },
    ]);
    editor.remove();
  });
});
