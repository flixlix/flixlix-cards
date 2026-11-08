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

  test("converting legacy fields maps power decimals and threshold", async () => {
    const { editor, lastConfig } = await mountEditor({
      entities: {},
      watt_threshold: 900,
      w_decimals: 1,
      kw_decimals: 2,
    });

    query(editor, ".legacy-fields-alert-button").click();

    const config = lastConfig();
    expect(config?.kilo_threshold).toBe(900);
    expect(config?.base_decimals).toBe(1);
    expect(config?.kilo_decimals).toBe(2);
    expect(config).not.toHaveProperty("watt_threshold");
    expect(config).not.toHaveProperty("w_decimals");
    expect(config).not.toHaveProperty("kw_decimals");
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

  test("the general form passes its value through as the whole config", async () => {
    const { editor, lastConfig } = await mountEditor({ entities: {} });
    const value = { type: "custom:power-flow-card-plus", title: "Home", entities: {} };

    query(editor, "ha-form").dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

    expect(lastConfig()).toEqual(value);
  });

  test("setConfig rejects unknown options so HA falls back to YAML", () => {
    const editor = new PowerFlowCardPlusEditor();

    expect(() => editor.setConfig(editorConfig({ entities: {}, not_an_option: true }))).toThrow(
      /not_an_option/
    );
  });
});
