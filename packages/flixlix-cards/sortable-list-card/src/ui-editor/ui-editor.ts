import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  type SortableListCardConfig,
  type SortableListItemConfig,
  type SortableListSaveAction,
} from "../types";

type SchemaField = Record<string, unknown>;

const SCHEMA: SchemaField[] = [
  { name: "title", selector: { text: {} } },
  { name: "entity", selector: { entity: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "value_format",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "csv", label: "Comma-separated (CSV)" },
              { value: "json", label: "JSON array" },
            ],
          },
        },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_handle", selector: { boolean: {} } },
      { name: "show_arrows", selector: { boolean: {} } },
      { name: "show_rank", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
    ],
  },
];

const LABELS: Record<string, string> = {
  title: "Title",
  entity: "Order entity (holds the current order)",
  value_format: "Stored value format",
  show_handle: "Show drag handle",
  show_arrows: "Show arrow buttons",
  show_rank: "Show rank number",
  show_state: "Show entity state",
};

@customElement("sortable-list-card-editor")
export class SortableListCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: SortableListCardConfig;
  @state() private _expanded: Record<number, boolean> = {};

  public setConfig(config: SortableListCardConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm().then(() => this.requestUpdate());
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const data: Record<string, unknown> = {
      value_format: "csv",
      show_handle: true,
      show_arrows: true,
      show_rank: true,
      show_state: false,
      ...this._config,
    };
    return html`
      <div class="root">
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${SCHEMA}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onGeneralChanged}
        ></ha-form>

        ${this._renderItemsSection()} ${this._renderSaveActionSection()}
      </div>
    `;
  }

  private _renderItemsSection() {
    const items = this._config?.items ?? [];
    return html`
      <section class="section">
        <header class="section-header">
          <h3>Items</h3>
          <p class="section-help">
            Each item's <code>key</code> is what gets stored in the order. Reference an entity to
            pull its name, icon and state automatically.
          </p>
        </header>
        ${items.length
          ? html`<div class="item-list">
              ${items.map((item, index) => this._renderItemRow(item, index))}
            </div>`
          : html`<div class="empty-list">No items yet — add one below.</div>`}
        <div class="add-row">
          <ha-button raised @click=${this._addItem}>Add item</ha-button>
        </div>
      </section>
    `;
  }

  private _renderItemRow(item: SortableListItemConfig, index: number) {
    const expanded = this._expanded[index] ?? false;
    const stateObj = item.entity ? this.hass.states[item.entity] : undefined;
    const friendly = stateObj?.attributes?.friendly_name as string | undefined;
    const label = item.name || friendly || item.key || item.entity || "(unnamed)";
    return html`
      <div class="item-card">
        <div class="item-card-header">
          <button
            class="item-toggle"
            type="button"
            aria-expanded=${expanded ? "true" : "false"}
            @click=${() => this._toggleExpanded(index)}
            title=${expanded ? "Collapse" : "Expand"}
          >
            ${item.icon
              ? html`<ha-icon class="item-icon" .icon=${item.icon}></ha-icon>`
              : html`<span class="item-rank">${index + 1}</span>`}
            <span class="item-title">${label}</span>
            <span class="item-chevron ${expanded ? "open" : ""}">▾</span>
          </button>
          <button
            class="item-remove"
            type="button"
            aria-label="Remove item"
            @click=${() => this._removeItem(index)}
          >
            ✕
          </button>
        </div>
        ${expanded
          ? html`
              <div class="item-card-body">
                <div class="field full-width">
                  <ha-entity-picker
                    allow-custom-entity
                    .hass=${this.hass}
                    .value=${item.entity ?? ""}
                    .label=${"Entity (optional)"}
                    @value-changed=${(e: CustomEvent) =>
                      this._patchItem(index, { entity: e.detail.value || undefined })}
                  ></ha-entity-picker>
                </div>
                <div class="field-grid">
                  <ha-textfield
                    label="Key"
                    helper=${item.entity ? "Defaults to the entity id" : "Required"}
                    .value=${item.key ?? ""}
                    @input=${(e: Event) =>
                      this._patchItem(index, {
                        key: (e.target as HTMLInputElement).value || undefined,
                      })}
                  ></ha-textfield>
                  <ha-textfield
                    label="Name"
                    .value=${item.name ?? ""}
                    @input=${(e: Event) =>
                      this._patchItem(index, {
                        name: (e.target as HTMLInputElement).value || undefined,
                      })}
                  ></ha-textfield>
                </div>
                <div class="field full-width">
                  <ha-icon-picker
                    .hass=${this.hass}
                    .value=${item.icon ?? ""}
                    .label=${"Icon"}
                    @value-changed=${(e: CustomEvent) =>
                      this._patchItem(index, { icon: e.detail.value || undefined })}
                  ></ha-icon-picker>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderSaveActionSection() {
    const action = this._config?.save_action;
    const hasYamlEditor = !!customElements.get("ha-yaml-editor");
    return html`
      <section class="section">
        <header class="section-header">
          <h3>Save action</h3>
          <p class="section-help">
            Service called on every reorder. Leave the service empty to default to
            <code>input_text.set_value</code> on the order entity above. Use the
            <code>{value}</code> placeholder in the data for the new order
            (<code>{value_csv}</code>, <code>{value_json}</code>, <code>{value_list}</code> are also
            available).
          </p>
        </header>
        <div class="field full-width">
          <ha-textfield
            label="Service"
            placeholder="input_text.set_value"
            .value=${action?.service ?? ""}
            @input=${(e: Event) =>
              this._patchSaveAction({ service: (e.target as HTMLInputElement).value.trim() })}
          ></ha-textfield>
        </div>
        ${hasYamlEditor
          ? html`<div class="field full-width yaml">
              <span class="yaml-label">Service data</span>
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${action?.data ?? { value: "{value}" }}
                @value-changed=${this._onSaveDataChanged}
              ></ha-yaml-editor>
            </div>`
          : html`<p class="section-help">
              Switch the card to YAML mode to edit the service data.
            </p>`}
      </section>
    `;
  }

  private _toggleExpanded(index: number) {
    this._expanded = { ...this._expanded, [index]: !this._expanded[index] };
  }

  private _addItem = () => {
    if (!this._config) return;
    const items = [...(this._config.items ?? []), {} as SortableListItemConfig];
    this._update({ items });
    this._expanded = { ...this._expanded, [items.length - 1]: true };
  };

  private _patchItem(index: number, patch: Partial<SortableListItemConfig>) {
    if (!this._config) return;
    const items = [...(this._config.items ?? [])];
    const current = items[index];
    if (!current) return;
    const merged: SortableListItemConfig = { ...current, ...patch };
    (Object.keys(merged) as (keyof SortableListItemConfig)[]).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    items[index] = merged;
    this._update({ items });
  }

  private _removeItem(index: number) {
    if (!this._config) return;
    const items = [...(this._config.items ?? [])];
    items.splice(index, 1);
    const expanded: Record<number, boolean> = {};
    Object.keys(this._expanded).forEach((k) => {
      const num = Number(k);
      const value = this._expanded[num];
      if (value === undefined) return;
      if (num < index) expanded[num] = value;
      else if (num > index) expanded[num - 1] = value;
    });
    this._expanded = expanded;
    this._update({ items });
  }

  private _patchSaveAction(patch: Partial<SortableListSaveAction>) {
    if (!this._config) return;
    const current = this._config.save_action ?? { service: "" };
    const merged: SortableListSaveAction = { ...current, ...patch };
    if (!merged.service) {
      this._update({ save_action: undefined });
      return;
    }
    if (!merged.data || Object.keys(merged.data).length === 0) delete merged.data;
    if (!merged.target || Object.keys(merged.target).length === 0) delete merged.target;
    this._update({ save_action: merged });
  }

  private _onSaveDataChanged = (event: CustomEvent) => {
    if (event.detail?.isValid === false) return;
    const value = event.detail?.value;
    this._patchSaveAction({
      data: value && typeof value === "object" && !Array.isArray(value) ? value : undefined,
    });
  };

  private _onGeneralChanged = (event: CustomEvent) => {
    const incoming = event.detail.value as Partial<SortableListCardConfig>;
    this._update(incoming);
  };

  private _update(patch: Partial<SortableListCardConfig>) {
    if (!this._config) return;
    const next: SortableListCardConfig = { ...this._config, ...patch };
    (Object.keys(next) as (keyof SortableListCardConfig)[]).forEach((key) => {
      if (key === "items" || key === "type") return;
      const value = next[key];
      if (value === undefined || value === "") delete next[key];
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

    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-header h3 {
      font-size: 1rem;
      margin: 0 0 4px;
    }

    .section-help {
      margin: 0;
      color: var(--secondary-text-color, #727272);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .section-help code {
      font-family: var(--code-font-family, monospace);
    }

    .empty-list {
      padding: 14px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 0.9rem;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 12px;
      text-align: center;
    }

    .item-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item-card {
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
      background: var(--card-background-color, transparent);
      overflow: hidden;
    }

    .item-card-header {
      display: flex;
      align-items: stretch;
      gap: 4px;
      padding: 4px 4px 4px 8px;
    }

    .item-toggle {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      color: inherit;
      font: inherit;
      text-align: left;
      min-width: 0;
    }

    .item-toggle:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .item-icon {
      flex: 0 0 auto;
      --mdc-icon-size: 20px;
      color: var(--state-icon-color, var(--primary-color));
    }

    .item-rank {
      flex: 0 0 auto;
      width: 20px;
      text-align: center;
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }

    .item-title {
      flex: 1 1 auto;
      font-size: 0.95rem;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-chevron {
      flex: 0 0 auto;
      color: var(--secondary-text-color, #727272);
      transition: transform 160ms ease;
      font-size: 0.9rem;
    }

    .item-chevron.open {
      transform: rotate(180deg);
    }

    .item-remove {
      border: none;
      background: transparent;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      width: 36px;
      border-radius: 8px;
      font-size: 1rem;
    }

    .item-remove:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      color: var(--error-color, #f44336);
    }

    .item-card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }

    .field {
      display: flex;
    }

    .field.full-width > *:not(.yaml-label) {
      flex: 1;
      width: 100%;
    }

    .field.yaml {
      flex-direction: column;
      gap: 6px;
    }

    .yaml-label {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "sortable-list-card-editor": SortableListCardEditor;
  }
}
