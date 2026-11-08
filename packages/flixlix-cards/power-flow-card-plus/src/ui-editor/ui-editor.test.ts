import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { PowerFlowCardPlusEditor } from "./ui-editor";

const { loadHaFormMock } = vi.hoisted(() => ({
  loadHaFormMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/ui-editor/utils/load-ha-form", () => ({
  loadHaForm: loadHaFormMock,
}));

const hass: Partial<HomeAssistant> = { localize: () => "" };

const editorConfig = (options: Record<string, unknown>) =>
  ({ type: "custom:power-flow-card-plus", ...options }) as PowerFlowCardPlusConfig;

async function mountEditor(options: Record<string, unknown>) {
  const editor = new PowerFlowCardPlusEditor();
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

async function openAdvanced(options: Record<string, unknown>) {
  const mounted = await mountEditor({ entities: {}, ...options });
  query(mounted.editor, 'link-subpage[path="advanced"]').dispatchEvent(
    new CustomEvent("open-sub-element-editor", { detail: { open: true } })
  );
  await mounted.editor.updateComplete;
  return { ...mounted, form: query(mounted.editor, "ha-form") };
}

function query(root: Element, selector: string): HTMLElement {
  const element = root.shadowRoot?.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`${selector} not rendered`);
  }
  return element;
}

async function rendered(root: Element, selector: string): Promise<HTMLElement> {
  const element = query(root, selector);
  if (element instanceof LitElement) {
    await element.updateComplete;
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

/**
 * The value a boolean field shows the way Home Assistant's ha-form draws it: the config value,
 * else the schema's `default` as the toggle's placeholder.
 */
function shownBoolean(form: HTMLElement, name: string): boolean {
  const data = "data" in form && typeof form.data === "object" ? form.data : undefined;
  const value = data && name in data ? Reflect.get(data, name) : undefined;
  if (typeof value === "boolean") {
    return value;
  }
  return fieldDefault("schema" in form ? form.schema : undefined, name) === true;
}

function fieldDefault(schema: unknown, name: string): unknown {
  if (!Array.isArray(schema)) {
    return undefined;
  }
  for (const item of schema) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    if ("name" in item && item.name === name && "default" in item) {
      return item.default;
    }
    const nested =
      "schema" in item && !("name" in item && item.name)
        ? fieldDefault(item.schema, name)
        : undefined;
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

describe("power flow ui editor", () => {
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
    { legacy: { watt_threshold: 900 }, current: { kilo_threshold: 900 } },
    { legacy: { w_decimals: 1 }, current: { base_decimals: 1 } },
    { legacy: { kw_decimals: 2 }, current: { kilo_decimals: 2 } },
  ])("converting $legacy rewrites it to $current", async ({ legacy, current }) => {
    const { editor, lastConfig } = await mountEditor({ entities: {}, ...legacy });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toEqual({ type: "custom:power-flow-card-plus", entities: {}, ...current });
  });

  test("converting keeps current fields over their legacy names and drops the legacy values", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: {},
      watt_threshold: 900,
      w_decimals: 1,
      kw_decimals: 2,
      kilo_threshold: 5000,
      base_decimals: 0,
      kilo_decimals: 1,
    });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toEqual({
      type: "custom:power-flow-card-plus",
      entities: {},
      kilo_threshold: 5000,
      base_decimals: 0,
      kilo_decimals: 1,
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
      watt_threshold: 900,
      w_decimals: 1,
      kw_decimals: 2,
    });

    query(editor, ".legacy-fields-alert-button").click();

    expect(lastConfig()).toMatchObject({ type: "custom:power-flow-card-plus", ...options });
  });

  test("the conversion alert disappears once nothing legacy is left", async () => {
    const { editor } = await mountEditor({
      entities: {},
      watt_threshold: 900,
      w_decimals: 1,
      kw_decimals: 2,
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

  test("individual devices page edits and removes rows by their position", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: { individual: [{ entity: "sensor.a" }, { entity: "sensor.b", name: "B" }] },
    });
    query(editor, 'link-subpage[path="individual"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;
    const devices = await rendered(editor, "individual-devices-editor");
    const rows = await rendered(devices, "individual-row-editor");

    rows.shadowRoot
      ?.querySelectorAll(".entity ha-entity-picker")[1]
      ?.dispatchEvent(new CustomEvent("value-changed", { detail: { value: "sensor.c" } }));
    expect(lastConfig()?.entities.individual).toEqual([
      { entity: "sensor.a" },
      { entity: "sensor.c", name: "B" },
    ]);

    query(rows, ".remove-icon").click();
    expect(lastConfig()?.entities.individual).toEqual([{ entity: "sensor.b", name: "B" }]);
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

  test("an individual device without display_zero shows the toggle off, as the card hides it at zero", async () => {
    const { editor } = await mountEditor({ entities: { individual: [{ entity: "sensor.ev" }] } });
    query(editor, 'link-subpage[path="individual"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;
    const devices = await rendered(editor, "individual-devices-editor");
    const rows = await rendered(devices, "individual-row-editor");
    query(rows, ".edit-icon").click();
    await rendered(devices, "individual-row-editor");

    expect(shownBoolean(query(rows, "ha-form"), "display_zero")).toBe(false);
  });

  test("the non-fossil page without display_zero shows the toggle off, as the card hides it at zero", async () => {
    const { editor } = await mountEditor({
      entities: { fossil_fuel_percentage: { entity: "sensor.fossil" } },
    });
    query(editor, 'link-subpage[path="fossil_fuel_percentage"]').dispatchEvent(
      new CustomEvent("open-sub-element-editor", { detail: { open: true } })
    );
    await editor.updateComplete;

    expect(shownBoolean(query(editor, "ha-form"), "display_zero")).toBe(false);
  });

  test("the general form passes its value through as the whole config", async () => {
    const { editor, lastConfig } = await mountEditor({ entities: {} });
    const value = { type: "custom:power-flow-card-plus", title: "Home", entities: {} };

    query(editor, "ha-form").dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

    expect(lastConfig()).toEqual(value);
  });

  test.each([
    { options: {}, shown: "duration" },
    { options: { use_new_flow_rate_model: true }, shown: "duration" },
    { options: { use_new_flow_rate_model: false }, shown: "relative" },
    { options: { flow_rate_model: "speed" }, shown: "speed" },
    { options: { flow_rate_model: "duration", use_new_flow_rate_model: false }, shown: "duration" },
  ])("the flow rate model select shows $shown for $options", async ({ options, shown }) => {
    const { form } = await openAdvanced(options);

    expect("data" in form && form.data).toMatchObject({ flow_rate_model: shown });
  });

  test("choosing a flow rate model writes flow_rate_model and drops the older alias", async () => {
    const { form, lastConfig } = await openAdvanced({ use_new_flow_rate_model: false });
    const value = {
      type: "custom:power-flow-card-plus",
      entities: {},
      use_new_flow_rate_model: false,
      flow_rate_model: "speed",
    };

    form.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

    expect(lastConfig()).toEqual({
      type: "custom:power-flow-card-plus",
      entities: {},
      flow_rate_model: "speed",
    });
  });

  test("setConfig rejects an unknown flow_rate_model so HA falls back to YAML", () => {
    const editor = new PowerFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, flow_rate_model: "fast" }))).toThrow(
      /flow_rate_model/
    );
  });

  test("setConfig rejects unknown options so HA falls back to YAML", () => {
    const editor = new PowerFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, not_an_option: true }))).toThrow(
      /not_an_option/
    );
  });
});
