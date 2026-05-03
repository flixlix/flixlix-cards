import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type EnergyBreakdownCardConfig, type EnergyBreakdownEntityConfig } from "../types";

type SchemaField = Record<string, unknown>;

const COMMON_DISPLAY_GRID: SchemaField = {
  type: "grid",
  name: "",
  schema: [
    { name: "show_legend", selector: { boolean: {} } },
    { name: "show_tooltip", selector: { boolean: {} } },
    { name: "show_total", selector: { boolean: {} } },
    { name: "show_icons", selector: { boolean: {} } },
  ],
};

const LEGEND_DETAIL_GRID: SchemaField = {
  type: "grid",
  name: "",
  schema: [
    { name: "show_legend_value", selector: { boolean: {} } },
    { name: "show_legend_percentage", selector: { boolean: {} } },
  ],
};

const DATA_GRID: SchemaField = {
  type: "grid",
  name: "",
  schema: [
    { name: "sort", selector: { boolean: {} } },
    { name: "group_others", selector: { boolean: {} } },
    { name: "max_items", selector: { number: { min: 0, mode: "box" } } },
    { name: "decimals", selector: { number: { min: 0, max: 6, mode: "box" } } },
    { name: "unit_of_measurement", selector: { text: {} } },
  ],
};

const ENERGY_GRID: SchemaField = {
  type: "grid",
  name: "",
  schema: [
    { name: "energy_date_selection", selector: { boolean: {} } },
    { name: "collection_key", selector: { text: {} } },
  ],
};

function buildSchema(chartType: "donut" | "bar"): SchemaField[] {
  const chartFields: SchemaField =
    chartType === "donut"
      ? {
          type: "grid",
          name: "",
          schema: [
            { name: "donut_thickness", selector: { number: { min: 4, max: 40, mode: "box" } } },
            { name: "section_radius", selector: { number: { min: 0, max: 80, mode: "box" } } },
            {
              name: "legend_position",
              selector: {
                select: {
                  mode: "dropdown",
                  options: [
                    { value: "bottom", label: "Bottom" },
                    { value: "right", label: "Right" },
                  ],
                },
              },
            },
          ],
        }
      : {
          type: "grid",
          name: "",
          schema: [
            { name: "bar_thickness", selector: { number: { min: 4, max: 60, mode: "box" } } },
            { name: "section_radius", selector: { number: { min: 0, max: 999, mode: "box" } } },
          ],
        };

  return [
    { name: "title", selector: { text: {} } },
    {
      type: "grid",
      name: "",
      schema: [
        {
          name: "chart_type",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "bar", label: "Bar" },
                { value: "donut", label: "Donut" },
              ],
            },
          },
        },
      ],
    },
    chartFields,
    COMMON_DISPLAY_GRID,
    LEGEND_DETAIL_GRID,
    DATA_GRID,
    ENERGY_GRID,
  ];
}

const LABELS: Record<string, string> = {
  title: "Title",
  chart_type: "Chart type",
  legend_position: "Legend position",
  show_legend: "Show legend",
  show_tooltip: "Show tooltip",
  show_total: "Show total",
  show_legend_value: "Show value in legend",
  show_legend_percentage: "Show percentage in legend",
  show_icons: "Show icons in legend",
  sort: "Sort by value",
  max_items: "Max items",
  group_others: "Group remaining as 'Other'",
  decimals: "Decimals",
  unit_of_measurement: "Unit of measurement",
  donut_thickness: "Donut thickness",
  bar_thickness: "Bar thickness",
  section_radius: "Section radius",
  energy_date_selection: "Sync to energy dashboard date range",
  collection_key: "Collection key (optional)",
};

@customElement("energy-breakdown-card-editor")
export class EnergyBreakdownCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyBreakdownCardConfig;
  @state() private _expanded: Record<number, boolean> = {};

  public setConfig(config: EnergyBreakdownCardConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const chartType = this._config.chart_type === "bar" ? "bar" : "donut";
    const data: Record<string, unknown> = {
      chart_type: "donut",
      legend_position: "bottom",
      show_legend: true,
      show_tooltip: true,
      show_total: true,
      show_legend_value: true,
      show_legend_percentage: true,
      show_icons: true,
      sort: true,
      group_others: true,
      energy_date_selection: false,
      ...this._config,
    };
    if (chartType === "bar") {
      delete data.legend_position;
    }
    return html`
      <div class="root">
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${buildSchema(chartType)}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onGeneralChanged}
        ></ha-form>

        <section class="entities-section">
          <header class="entities-header">
            <h3>Entities</h3>
            <p class="entities-help">Pick the energy sources to include in the chart.</p>
          </header>
          ${this._renderEntityRows()}
          <div class="add-row">
            <ha-entity-picker
              allow-custom-entity
              .hass=${this.hass}
              .value=${""}
              @value-changed=${this._onAddEntity}
            ></ha-entity-picker>
          </div>
        </section>
      </div>
    `;
  }

  private _renderEntityRows() {
    const entities = this._config?.entities ?? [];
    if (!entities.length) {
      return html`<div class="empty-list">No entities yet — add one below.</div>`;
    }
    return html`
      <div class="entity-list">
        ${entities.map((entity, index) => this._renderEntityRow(entity, index))}
      </div>
    `;
  }

  private _renderEntityRow(entity: EnergyBreakdownEntityConfig, index: number) {
    const expanded = this._expanded[index] ?? false;
    const stateObj = entity.entity ? this.hass.states[entity.entity] : undefined;
    const fallbackLabel =
      entity.name ?? (stateObj?.attributes.friendly_name as string | undefined) ?? entity.entity;
    return html`
      <div class="entity-card">
        <div class="entity-card-header">
          <button
            class="entity-toggle"
            type="button"
            aria-expanded=${expanded ? "true" : "false"}
            @click=${() => this._toggleExpanded(index)}
            title=${expanded ? "Collapse" : "Expand"}
          >
            <span class="entity-swatch" style="background:${entity.color ?? "currentColor"}"></span>
            <span class="entity-title">${fallbackLabel || "(unconfigured)"}</span>
            <span class="entity-chevron ${expanded ? "open" : ""}">▾</span>
          </button>
          <button
            class="entity-remove"
            type="button"
            aria-label="Remove entity"
            @click=${() => this._removeEntity(index)}
          >
            ✕
          </button>
        </div>
        ${expanded
          ? html`
              <div class="entity-card-body">
                <div class="field full-width">
                  <ha-entity-picker
                    allow-custom-entity
                    .hass=${this.hass}
                    .value=${entity.entity}
                    .label=${"Entity"}
                    @value-changed=${(e: CustomEvent) =>
                      this._onEntityChanged(index, e.detail.value)}
                  ></ha-entity-picker>
                </div>
                <div class="field-grid">
                  <ha-textfield
                    label="Name"
                    .value=${entity.name ?? ""}
                    @input=${(e: Event) =>
                      this._patchEntity(index, {
                        name: (e.target as HTMLInputElement).value || undefined,
                      })}
                  ></ha-textfield>
                  <ha-textfield
                    label="Color"
                    placeholder="#488fc2 or var(--energy-grid-consumption-color)"
                    .value=${entity.color ?? ""}
                    @input=${(e: Event) =>
                      this._patchEntity(index, {
                        color: (e.target as HTMLInputElement).value || undefined,
                      })}
                  ></ha-textfield>
                </div>
                <div class="field-grid">
                  <ha-icon-picker
                    .hass=${this.hass}
                    .value=${entity.icon ?? ""}
                    .label=${"Icon"}
                    @value-changed=${(e: CustomEvent) =>
                      this._patchEntity(index, { icon: e.detail.value || undefined })}
                  ></ha-icon-picker>
                  <ha-textfield
                    label="Unit override"
                    .value=${entity.unit_of_measurement ?? ""}
                    @input=${(e: Event) =>
                      this._patchEntity(index, {
                        unit_of_measurement: (e.target as HTMLInputElement).value || undefined,
                      })}
                  ></ha-textfield>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _toggleExpanded(index: number) {
    this._expanded = { ...this._expanded, [index]: !this._expanded[index] };
  }

  private _onAddEntity = (event: CustomEvent) => {
    const value = event.detail.value as string;
    if (!value || !this._config) return;
    const entities = [...(this._config.entities ?? []), { entity: value }];
    this._update({ entities });
    this._expanded = { ...this._expanded, [entities.length - 1]: true };
    const target = event.target as { value?: string } | null;
    if (target) target.value = "";
  };

  private _onEntityChanged(index: number, value: string) {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    if (!value) {
      entities.splice(index, 1);
    } else {
      entities[index] = { ...entities[index]!, entity: value };
    }
    this._update({ entities });
  }

  private _patchEntity(index: number, patch: Partial<EnergyBreakdownEntityConfig>) {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    const current = entities[index];
    if (!current) return;
    const merged = { ...current, ...patch };
    Object.keys(merged).forEach((key) => {
      const k = key as keyof EnergyBreakdownEntityConfig;
      if (merged[k] === undefined || merged[k] === "") delete merged[k];
    });
    entities[index] = merged;
    this._update({ entities });
  }

  private _removeEntity(index: number) {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    entities.splice(index, 1);
    const expanded: Record<number, boolean> = {};
    Object.keys(this._expanded).forEach((k) => {
      const n = Number(k);
      const v = this._expanded[n];
      if (v === undefined) return;
      if (n < index) expanded[n] = v;
      else if (n > index) expanded[n - 1] = v;
    });
    this._expanded = expanded;
    this._update({ entities });
  }

  private _onGeneralChanged = (event: CustomEvent) => {
    const incoming = event.detail.value as Partial<EnergyBreakdownCardConfig>;
    this._update(incoming);
  };

  private _update(patch: Partial<EnergyBreakdownCardConfig>) {
    if (!this._config) return;
    const next: EnergyBreakdownCardConfig = { ...this._config, ...patch };
    if (next.chart_type === "bar") {
      delete next.legend_position;
    }
    Object.keys(next).forEach((key) => {
      const k = key as keyof EnergyBreakdownCardConfig;
      if (next[k] === undefined || next[k] === "") {
        delete next[k];
      }
    });
    this._config = next;
    fireEvent(this, "config-changed", { config: next });
  }

  private _computeLabel = (schema: { name: string; label?: string }) => {
    return LABELS[schema.name] ?? schema.label ?? schema.name;
  };

  static styles = css`
    .root {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    ha-form {
      width: 100%;
    }

    .entities-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .entities-header h3 {
      font-size: 1rem;
      margin: 0 0 4px;
    }

    .entities-help {
      margin: 0;
      color: var(--secondary-text-color, #727272);
      font-size: 0.85rem;
    }

    .empty-list {
      padding: 14px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 0.9rem;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 12px;
      text-align: center;
    }

    .entity-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .entity-card {
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
      background: var(--card-background-color, transparent);
      overflow: hidden;
    }

    .entity-card-header {
      display: flex;
      align-items: stretch;
      gap: 4px;
      padding: 4px 4px 4px 8px;
    }

    .entity-toggle {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px 8px;
      border-radius: 8px;
      color: inherit;
      font: inherit;
      text-align: left;
      min-width: 0;
    }

    .entity-toggle:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .entity-swatch {
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
    }

    .entity-title {
      flex: 1 1 auto;
      font-size: 0.95rem;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-chevron {
      flex: 0 0 auto;
      color: var(--secondary-text-color, #727272);
      transition: transform 160ms ease;
      font-size: 0.9rem;
    }

    .entity-chevron.open {
      transform: rotate(180deg);
    }

    .entity-remove {
      border: none;
      background: transparent;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      width: 36px;
      border-radius: 8px;
      font-size: 1rem;
    }

    .entity-remove:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      color: var(--error-color, #f44336);
    }

    .entity-card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }

    .field {
      display: flex;
    }

    .field.full-width > * {
      flex: 1;
      width: 100%;
    }

    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .field-grid > * {
      width: 100%;
    }

    @media (max-width: 480px) {
      .field-grid {
        grid-template-columns: 1fr;
      }
    }

    .add-row {
      display: flex;
    }

    .add-row ha-entity-picker {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-breakdown-card-editor": EnergyBreakdownCardEditor;
  }
}
