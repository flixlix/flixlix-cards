import "@flixlix-cards/shared/ui-editor/components/link-subpage";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { type FlixlixPowerCardConfig } from "../types";
import "./components/list-editor";
import "./components/subpage-header";
import { advancedSchema, cardConfigStruct, generalSchema } from "./schema/_schema-all";
import { batterySchema } from "./schema/battery";
import { deviceSchema } from "./schema/device";
import { gaugesSchema } from "./schema/gauges";
import { gridSchema } from "./schema/grid";
import { homeSchema } from "./schema/home";
import { solarSchema } from "./schema/solar";

type ConfigPage =
  | null
  | "grid"
  | "solars"
  | "batteries"
  | "home"
  | "devices"
  | "gauges"
  | "advanced";

const devicesPageSchema = [
  {
    name: "max_devices",
    label: "Max devices to show",
    selector: { number: { min: 1, max: 20, step: 1, mode: "box" } },
  },
] as const;

interface PageDef {
  page: Exclude<ConfigPage, null>;
  title: string;
  icon: string;
}

const PAGES: PageDef[] = [
  { page: "grid", title: "Grid", icon: "mdi:transmission-tower" },
  { page: "solars", title: "Solar", icon: "mdi:weather-sunny" },
  { page: "batteries", title: "Batteries", icon: "mdi:battery-high" },
  { page: "home", title: "Home", icon: "mdi:home-variant-outline" },
  { page: "devices", title: "Devices", icon: "mdi:lightning-bolt-outline" },
  { page: "gauges", title: "Gauges", icon: "mdi:gauge" },
  { page: "advanced", title: "Advanced", icon: "mdi:cog-outline" },
];

@customElement("power-pulse-card-editor")
export class FlixlixPowerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: FlixlixPowerCardConfig;
  @state() private _currentPage: ConfigPage = null;

  public setConfig(config: FlixlixPowerCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;

    if (this._currentPage !== null) {
      return this._renderSubpage(this._currentPage);
    }

    return html`
      <div class="editor">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${generalSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onGeneralChanged}
        ></ha-form>

        ${PAGES.map((page) => {
          const subtitle = this._secondaryFor(page.page);
          return html`
            <link-subpage
              path=${page.page}
              header=${page.title}
              icon=${page.icon}
              outlined
              @open-sub-element-editor=${() => this._goTo(page.page)}
            >
              ${subtitle
                ? html`<span slot="secondary" class="secondary">${subtitle}</span>`
                : nothing}
            </link-subpage>
          `;
        })}
      </div>
    `;
  }

  private _renderSubpage(page: Exclude<ConfigPage, null>): TemplateResult {
    const def = PAGES.find((p) => p.page === page)!;
    return html`
      <flixlix-subpage-header
        .header=${def.title}
        @flixlix-go-back=${this._goBack}
      ></flixlix-subpage-header>
      ${this._renderPageBody(page)}
    `;
  }

  private _renderPageBody(page: Exclude<ConfigPage, null>): TemplateResult {
    if (!this._config) return html``;

    if (page === "advanced") {
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${advancedSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onAdvancedChanged}
        ></ha-form>
      `;
    }

    if (page === "solars") {
      return html`
        <flixlix-list-editor
          .hass=${this.hass}
          .items=${this._config.entities.solars ?? []}
          .itemSchema=${solarSchema}
          .singularLabel=${"Solar"}
          .addLabel=${"Add solar source"}
          @flixlix-list-changed=${(ev: CustomEvent) =>
            this._setListSection("solars", ev.detail.items)}
        ></flixlix-list-editor>
      `;
    }

    if (page === "batteries") {
      return html`
        <flixlix-list-editor
          .hass=${this.hass}
          .items=${this._config.entities.batteries ?? []}
          .itemSchema=${batterySchema}
          .singularLabel=${"Battery"}
          .addLabel=${"Add battery"}
          @flixlix-list-changed=${(ev: CustomEvent) =>
            this._setListSection("batteries", ev.detail.items)}
        ></flixlix-list-editor>
      `;
    }

    if (page === "devices") {
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${devicesPageSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onDevicesPageChanged}
        ></ha-form>
        <flixlix-list-editor
          .hass=${this.hass}
          .items=${this._config.entities.devices ?? []}
          .itemSchema=${deviceSchema}
          .singularLabel=${"Device"}
          .addLabel=${"Add device"}
          @flixlix-list-changed=${(ev: CustomEvent) =>
            this._setListSection("devices", ev.detail.items)}
        ></flixlix-list-editor>
      `;
    }

    if (page === "gauges") {
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config.gauges ?? {}}
          .schema=${gaugesSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onGaugesChanged}
        ></ha-form>
      `;
    }

    const schema = SINGLE_SCHEMAS[page];
    const data = (this._config.entities[page as "grid" | "home"] as Record<string, unknown>) ?? {};
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${(ev: CustomEvent) => this._onSingleSectionChanged(page, ev)}
      ></ha-form>
    `;
  }

  private _secondaryFor(page: Exclude<ConfigPage, null>): string {
    if (!this._config) return "";
    const entities = this._config.entities;
    switch (page) {
      case "grid":
        return entityLabel(entities.grid?.entity);
      case "solars": {
        const n = entities.solars?.length ?? 0;
        return n === 0 ? "Not configured" : n === 1 ? "1 source" : `${n} sources`;
      }
      case "home":
        return entityLabel(entities.home?.entity) || "Auto-computed";
      case "batteries": {
        const n = entities.batteries?.length ?? 0;
        return n === 0 ? "Not configured" : n === 1 ? "1 battery" : `${n} batteries`;
      }
      case "devices": {
        const n = entities.devices?.length ?? 0;
        return n === 0 ? "Not configured" : n === 1 ? "1 device" : `${n} devices`;
      }
      case "gauges": {
        const enabled: string[] = [];
        if (this._config.gauges?.self_consumption) enabled.push("Self-consumption");
        if (this._config.gauges?.autarky) enabled.push("Autarky");
        return enabled.length === 0 ? "None" : enabled.join(" + ");
      }
      case "advanced":
        return "Display, decimals, flow tuning";
      default:
        return "";
    }
  }

  private _computeLabel = (schema: { name?: string; label?: string }): string => {
    return schema.label ?? schema.name ?? "";
  };

  private _goTo = (page: ConfigPage): void => {
    this._currentPage = page;
  };

  private _goBack = (): void => {
    this._currentPage = null;
  };

  private _onGeneralChanged = (ev: CustomEvent): void => {
    if (!this._config) return;
    const merged = { ...this._config, ...(ev.detail.value as object) } as FlixlixPowerCardConfig;
    this._emit(merged);
  };

  private _onAdvancedChanged = (ev: CustomEvent): void => {
    if (!this._config) return;
    const merged = { ...this._config, ...(ev.detail.value as object) } as FlixlixPowerCardConfig;
    this._emit(merged);
  };

  private _onDevicesPageChanged = (ev: CustomEvent): void => {
    if (!this._config) return;
    const value = ev.detail.value as { max_devices?: number };
    const merged = { ...this._config } as FlixlixPowerCardConfig;
    // Strip the field rather than persist `0` / `undefined`, so the YAML
    // stays clean when the user clears the input.
    if (value.max_devices && value.max_devices > 0) {
      merged.max_devices = Math.floor(value.max_devices);
    } else {
      delete merged.max_devices;
    }
    this._emit(merged);
  };

  private _onGaugesChanged = (ev: CustomEvent): void => {
    if (!this._config) return;
    const value = ev.detail.value as { self_consumption?: boolean; autarky?: boolean };
    const merged = { ...this._config } as FlixlixPowerCardConfig;
    const enabled: { self_consumption?: boolean; autarky?: boolean } = {};
    if (value.self_consumption) enabled.self_consumption = true;
    if (value.autarky) enabled.autarky = true;
    if (Object.keys(enabled).length === 0) {
      delete merged.gauges;
    } else {
      merged.gauges = enabled;
    }
    this._emit(merged);
  };

  private _onSingleSectionChanged(page: "grid" | "home", ev: CustomEvent): void {
    if (!this._config) return;
    const value = ev.detail.value as Record<string, unknown>;
    const cleaned = stripEmpty(value);
    const entities = { ...(this._config.entities ?? {}) };
    if (Object.keys(cleaned).length === 0) {
      delete (entities as Record<string, unknown>)[page];
    } else {
      (entities as Record<string, unknown>)[page] = cleaned;
    }
    this._emit({ ...this._config, entities });
  }

  private _setListSection(
    section: "solars" | "batteries" | "devices",
    items: Record<string, unknown>[]
  ): void {
    if (!this._config) return;
    const entities = { ...(this._config.entities ?? {}), [section]: items };
    this._emit({ ...this._config, entities });
  }

  private _emit(config: FlixlixPowerCardConfig): void {
    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  static styles = css`
    .editor {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 4px;
    }

    .secondary {
      display: block;
      color: var(--secondary-text-color);
      font-size: 12px;
    }

    ha-form {
      display: block;
      width: 100%;
    }

    flixlix-subpage-header {
      display: block;
    }

    flixlix-list-editor,
    ha-form {
      margin-top: 4px;
    }
  `;
}

const SINGLE_SCHEMAS: Record<"grid" | "home", readonly unknown[]> = {
  grid: gridSchema,
  home: homeSchema,
};

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const sub = stripEmpty(v as Record<string, unknown>);
      if (Object.keys(sub).length > 0) out[k] = sub;
      continue;
    }
    out[k] = v;
  }
  return out as Partial<T>;
}

function entityLabel(entity: unknown): string {
  if (typeof entity === "string") return entity || "";
  if (entity && typeof entity === "object") {
    const e = entity as { consumption?: string; production?: string };
    return [e.consumption, e.production].filter(Boolean).join(" / ");
  }
  return "";
}

declare global {
  interface HTMLElementTagNameMap {
    "power-pulse-card-editor": FlixlixPowerCardEditor;
  }
}
