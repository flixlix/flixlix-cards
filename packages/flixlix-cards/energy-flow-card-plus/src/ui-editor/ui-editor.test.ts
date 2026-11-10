import { type PowerFlowCardPlusConfig, TOPOLOGIES } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { advancedOptionsSchema } from "./schema/_schema-all";
import { EnergyFlowCardPlusEditor } from "./ui-editor";

const { loadHaFormMock } = vi.hoisted(() => ({
  loadHaFormMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/ui-editor/utils/load-ha-form", () => ({
  loadHaForm: loadHaFormMock,
}));

const isToggle = (field: unknown) =>
  typeof field === "object" &&
  field !== null &&
  "selector" in field &&
  typeof field.selector === "object" &&
  field.selector !== null &&
  "boolean" in field.selector;

const hass: Partial<HomeAssistant> = { localize: () => "", states: {} };

const editorConfig = (options: Record<string, unknown>) =>
  ({ type: "custom:energy-flow-card-plus", ...options }) as PowerFlowCardPlusConfig;

async function mountEditor(options: Record<string, unknown>) {
  const editor = new EnergyFlowCardPlusEditor();
  editor.hass = hass as HomeAssistant;
  editor.setConfig(editorConfig(options));
  const configChanged = vi.fn<(ev: Event) => void>();
  editor.addEventListener("config-changed", configChanged);
  document.body.append(editor);
  await editor.updateComplete;
  const lastConfig = () => {
    const ev = configChanged.mock.lastCall?.[0];
    return ev instanceof CustomEvent
      ? (ev.detail as { config: PowerFlowCardPlusConfig }).config
      : undefined;
  };
  return { editor, lastConfig };
}

function query(root: Element, selector: string): HTMLElement {
  const element = root.shadowRoot?.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`${selector} not rendered`);
  }
  return element;
}

/** Field names a form edits directly on its value, skipping nested objects like secondary_info. */
function ownFieldNames(schema: unknown): string[] {
  if (!Array.isArray(schema)) {
    return [];
  }
  return schema.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const name = "name" in item && typeof item.name === "string" ? item.name : "";
    if ("schema" in item) {
      return name ? [] : ownFieldNames(item.schema);
    }
    return name ? [name] : [];
  });
}

describe("energy flow ui editor", () => {
  beforeEach(() => {
    loadHaFormMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  test("loads ha-form when attached", async () => {
    await mountEditor({ entities: {} });

    expect(loadHaFormMock).toHaveBeenCalledTimes(1);
  });

  test.each([
    { legacy: { wh_threshold: 900 }, current: { kilo_threshold: 900 } },
    { legacy: { wh_kwh_threshold: 1200 }, current: { kilo_threshold: 1200 } },
    { legacy: { wh_decimals: 1 }, current: { base_decimals: 1 } },
    { legacy: { kwh_decimals: 2 }, current: { kilo_decimals: 2 } },
    { legacy: { mwh_decimals: 3 }, current: { mega_decimals: 3 } },
  ])("converting $legacy rewrites it to $current", async ({ legacy, current }) => {
    const { editor, lastConfig } = await mountEditor({ entities: {}, ...legacy });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toEqual({
      type: "custom:energy-flow-card-plus",
      entities: {},
      ...current,
    });
  });

  test("wh_kwh_threshold wins over wh_threshold and both are removed", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: {},
      wh_threshold: 900,
      wh_kwh_threshold: 1200,
    });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toEqual({
      type: "custom:energy-flow-card-plus",
      entities: {},
      kilo_threshold: 1200,
    });
  });

  test("converting keeps current fields over their legacy names and drops the legacy values", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: {},
      wh_kwh_threshold: 1200,
      wh_decimals: 1,
      kwh_decimals: 2,
      mwh_decimals: 3,
      kilo_threshold: 5000,
      base_decimals: 0,
      kilo_decimals: 1,
      mega_decimals: 2,
    });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toEqual({
      type: "custom:energy-flow-card-plus",
      entities: {},
      kilo_threshold: 5000,
      base_decimals: 0,
      kilo_decimals: 1,
      mega_decimals: 2,
    });
  });

  test("converting leaves unrelated options and legacy individual slots untouched", async () => {
    const options = {
      title: "Home",
      clickable_entities: true,
      entities: {
        grid: { entity: "sensor.grid" },
        individual1: { entity: "sensor.legacy_1" },
      },
    };
    const { editor, lastConfig } = await mountEditor({
      ...options,
      wh_threshold: 900,
      wh_kwh_threshold: 1200,
      wh_decimals: 1,
      kwh_decimals: 2,
      mwh_decimals: 3,
    });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toMatchObject({ type: "custom:energy-flow-card-plus", ...options });
  });

  test("the conversion alert disappears once nothing legacy is left", async () => {
    const { editor } = await mountEditor({
      entities: {},
      wh_threshold: 900,
      wh_kwh_threshold: 1200,
      wh_decimals: 1,
      kwh_decimals: 2,
      mwh_decimals: 3,
    });

    query(editor, ".legacy-fields-alert-button").click();
    await editor.updateComplete;

    expect(editor.shadowRoot?.querySelector(".legacy-fields-alert")).toBeNull();
  });

  test("converting legacy individual slots appends them to entities.individual", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: {
        individual: [{ entity: "sensor.existing" }],
        individual1: { entity: "sensor.legacy_1" },
        individual2: [{ entity: "sensor.legacy_2" }, { entity: "sensor.legacy_3" }],
      },
    });

    query(editor, ".legacy-fields-alert-button").click();

    const config = lastConfig();
    expect(config?.entities.individual).toEqual([
      { entity: "sensor.existing" },
      { entity: "sensor.legacy_1" },
      { entity: "sensor.legacy_2" },
      { entity: "sensor.legacy_3" },
    ]);
    expect(config?.entities).not.toHaveProperty("individual1");
    expect(config?.entities).not.toHaveProperty("individual2");
  });

  test("editing an entity page nests the form value under that entity", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: { grid: { entity: "sensor.old_grid" }, solar: { entity: "sensor.solar" } },
    });

    query(editor, 'link-subpage[path="grid"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;
    query(editor, "ha-form").dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { entity: "sensor.new_grid" } } })
    );

    expect(lastConfig()?.entities).toEqual({
      grid: { entity: "sensor.new_grid" },
      solar: { entity: "sensor.solar" },
    });
  });

  test("filling a separated field over a combined entity keeps only consumption and production", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: { grid: { entity: "sensor.grid" } },
    });

    query(editor, 'link-subpage[path="grid"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;
    // What ha-form emits: the nested "Separated" form spreads the old string into the object.
    const spread = Object.fromEntries(Array.from("sensor.grid", (char, index) => [index, char]));
    query(editor, "ha-form").dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { entity: { ...spread, consumption: "sensor.grid_import" } } },
      })
    );

    expect(lastConfig()?.entities.grid).toEqual({ entity: { consumption: "sensor.grid_import" } });
  });

  test.each(["grid", "solar", "battery"])(
    "the %s page edits its own unit, unit white space and decimals",
    async (page) => {
      const { editor, lastConfig } = await mountEditor({
        entities: { [page]: { entity: "sensor.x" } },
      });
      query(editor, `link-subpage[path="${page}"]`).dispatchEvent(
        new CustomEvent("open-sub-element-editor", { detail: { open: true } })
      );
      await editor.updateComplete;
      const form = query(editor, "ha-form");

      expect(ownFieldNames("schema" in form ? form.schema : undefined)).toEqual(
        expect.arrayContaining(["unit_of_measurement", "unit_white_space", "decimals"])
      );

      const value = {
        entity: "sensor.x",
        unit_of_measurement: "L/min",
        unit_white_space: false,
        decimals: 2,
      };
      form.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

      expect(lastConfig()?.entities).toEqual({ [page]: value });
    }
  );

  test("the general form passes its value through as the whole config", async () => {
    const { editor, lastConfig } = await mountEditor({ entities: {} });
    const value = { type: "custom:energy-flow-card-plus", title: "Home", entities: {} };

    query(editor, "ha-form").dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

    expect(lastConfig()).toEqual(value);
  });

  test("the buttons page adds a button to the config", async () => {
    const { editor, lastConfig } = await mountEditor({ entities: {}, dashboard_link: "/energy" });
    query(editor, 'link-subpage[path="buttons"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;
    const list = query(editor, "buttons-editor");
    if ("updateComplete" in list) {
      await list.updateComplete;
    }

    query(list, ".add-button").click();

    expect(lastConfig()).toEqual({
      type: "custom:energy-flow-card-plus",
      entities: {},
      dashboard_link: "/energy",
      buttons: [{ icon: "mdi:gesture-tap-button" }],
    });
  });

  test("setConfig rejects unknown options so HA falls back to YAML", () => {
    const editor = new EnergyFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, not_an_option: true }))).toThrow(
      /not_an_option/
    );
  });
  test.each(TOPOLOGIES)("setConfig accepts topology %s", (topology) => {
    const editor = new EnergyFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, topology }))).not.toThrow();
  });

  test("setConfig rejects an unknown topology so HA falls back to YAML", () => {
    const editor = new EnergyFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, topology: "mesh" }))).toThrow(
      /topology/
    );
  });
  // HA's ha-form grid top-aligns its cells, so a toggle next to a taller field sits off-centre.
  test("every row of the advanced grids pairs toggles with toggles and fields with fields", () => {
    const grids = advancedOptionsSchema("show").filter((item) => "column_min_width" in item);
    const mixedRows = grids.flatMap((grid) => {
      const fields: unknown[] = "schema" in grid && Array.isArray(grid.schema) ? grid.schema : [];
      const kinds = fields.map((field) => (isToggle(field) ? "toggle" : "field"));
      return Array.from({ length: Math.ceil(kinds.length / 2) }, (_, row) =>
        kinds.slice(row * 2, row * 2 + 2)
      ).filter((row) => new Set(row).size > 1);
    });

    expect(grids.length).toBeGreaterThan(0);
    expect(mixedRows).toEqual([]);
  });
});
