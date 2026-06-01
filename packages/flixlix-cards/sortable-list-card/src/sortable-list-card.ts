import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import {
  type HomeAssistant,
  type LovelaceCard,
  type LovelaceCardEditor,
} from "custom-card-helpers";
import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import packageJson from "../package.json" with { type: "json" };
import { type ResolvedItem, type SortableListCardConfig } from "./types";
import {
  buildSaveCall,
  configKeys,
  formatOrder,
  reconcileOrder,
  resolveItems,
  resolveOrder,
} from "./utils";

registerCustomCard({
  type: "sortable-list-card",
  name: "Sortable List Card",
  description: "A drag-and-drop reorderable list that saves the order via any service.",
  version: packageJson.version,
});

const PENDING_TIMEOUT = 3000;

@customElement("sortable-list-card")
export class SortableListCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: SortableListCardConfig;
  @state() private _order: string[] = [];
  @state() private _dragging = false;
  @state() private _dropPos: number | null = null;

  private _dragKey: string | null = null;
  private _pending: string | null = null;
  private _pendingTimer?: ReturnType<typeof setTimeout>;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("sortable-list-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): SortableListCardConfig {
    const inputTextEntity = Object.keys(hass?.states ?? {}).find((id) =>
      id.startsWith("input_text.")
    );
    return {
      type: "custom:sortable-list-card",
      title: "Priority",
      entity: inputTextEntity ?? "input_text.priority_order",
      items: [
        { key: "first", name: "First", icon: "mdi:numeric-1-box" },
        { key: "second", name: "Second", icon: "mdi:numeric-2-box" },
        { key: "third", name: "Third", icon: "mdi:numeric-3-box" },
      ],
    };
  }

  public setConfig(config: SortableListCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    if (!Array.isArray(config.items)) throw new Error("`items` must be a list");
    this._config = {
      show_handle: true,
      show_arrows: true,
      show_rank: true,
      show_state: false,
      ...config,
    };
    this._order = reconcileOrder(configKeys(this._config), this._order);
  }

  public getCardSize(): number {
    return (this._config?.items?.length ?? 3) + 1;
  }

  public disconnectedCallback(): void {
    if (this._pendingTimer) clearTimeout(this._pendingTimer);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate?.(changed);
    if (!this._config || !this.hass) return;
    if (changed.has("hass") || changed.has("_config")) {
      this._syncFromState();
    }
  }

  private _syncFromState(): void {
    if (!this._config) return;
    if (this._dragging) return;
    const entity = this._config.entity;
    if (!entity) return;
    const stateObj = this.hass.states[entity];
    const cur = stateObj ? stateObj.state : "";
    if (this._pending !== null) {
      if (cur === this._pending) this._clearPending();
      return;
    }
    const next = resolveOrder(this._config, cur);
    if (JSON.stringify(next) !== JSON.stringify(this._order)) {
      this._order = next;
    }
  }

  private _clearPending(): void {
    this._pending = null;
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = undefined;
    }
  }

  private _move(from: number, to: number): void {
    if (to < 0 || to >= this._order.length || from === to) return;
    const arr = this._order.slice();
    const [moved] = arr.splice(from, 1);
    if (moved === undefined) return;
    arr.splice(to, 0, moved);
    this._order = arr;
    this._commit();
  }

  private _moveTo(from: number, pos: number): void {
    const arr = this._order.slice();
    const [moved] = arr.splice(from, 1);
    if (moved === undefined) return;
    let insert = pos > from ? pos - 1 : pos;
    insert = Math.max(0, Math.min(insert, arr.length));
    if (insert === from) {
      arr.splice(from, 0, moved);
      this._order = arr;
      return;
    }
    arr.splice(insert, 0, moved);
    this._order = arr;
    this._commit();
  }

  private _commit(): void {
    if (!this._config || !this.hass) return;
    if (this._config.entity) {
      this._pending = formatOrder(this._order, this._config.value_format ?? "csv");
      if (this._pendingTimer) clearTimeout(this._pendingTimer);
      this._pendingTimer = setTimeout(() => {
        this._pending = null;
        this._pendingTimer = undefined;
      }, PENDING_TIMEOUT);
    }
    const call = buildSaveCall(this._config, this._order);
    if (call) {
      this.hass.callService(call.domain, call.service, call.serviceData, call.target);
    }
  }

  private _onDragStart(event: DragEvent, key: string, index: number): void {
    this._dragging = true;
    this._dragKey = key;
    this._dropPos = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    }
  }

  private _onDragOver(event: DragEvent, index: number): void {
    if (!this._dragging) return;
    event.preventDefault();
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const after = event.clientY - rect.top > rect.height / 2;
    this._dropPos = after ? index + 1 : index;
  }

  private _onDragEnd(): void {
    if (this._dragKey !== null && this._dropPos !== null) {
      const from = this._order.indexOf(this._dragKey);
      if (from !== -1) this._moveTo(from, this._dropPos);
    }
    this._dragging = false;
    this._dragKey = null;
    this._dropPos = null;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const title = this._config.title;
    const resolved = resolveItems(this.hass, this._config);
    if (!resolved.length) {
      return html`<ha-card .header=${title}>
        <div class="empty">No items configured. Add some in the card editor.</div>
      </ha-card>`;
    }
    const byKey = new Map(resolved.map((item) => [item.key, item]));
    const missingEntity =
      this._config.entity && !this.hass.states[this._config.entity] ? this._config.entity : null;
    const n = this._order.length;
    return html`
      <ha-card .header=${title}>
        ${missingEntity
          ? html`<div class="warning">Entity <code>${missingEntity}</code> not found.</div>`
          : nothing}
        <div class=${classMap({ list: true, dragging: this._dragging })}>
          ${repeat(
            this._order,
            (key) => key,
            (key, index) => this._renderRow(byKey.get(key), key, index, n)
          )}
        </div>
      </ha-card>
    `;
  }

  private _renderRow(
    item: ResolvedItem | undefined,
    key: string,
    index: number,
    total: number
  ): TemplateResult {
    const name = item?.name ?? key;
    const icon = item?.icon;
    const showHandle = this._config?.show_handle !== false;
    const showArrows = this._config?.show_arrows !== false;
    const showRank = this._config?.show_rank !== false;
    const showState = this._config?.show_state === true && item?.entity;
    const dropBefore = this._dropPos !== null && this._dropPos < total && this._dropPos === index;
    const dropAfter = this._dropPos !== null && this._dropPos >= total && index === total - 1;
    return html`
      <div
        class=${classMap({
          row: true,
          drag: this._dragging && this._dragKey === key,
          "drop-before": dropBefore,
          "drop-after": dropAfter,
        })}
        draggable="true"
        data-key=${key}
        @dragstart=${(e: DragEvent) => this._onDragStart(e, key, index)}
        @dragover=${(e: DragEvent) => this._onDragOver(e, index)}
        @dragend=${this._onDragEnd}
        @drop=${(e: DragEvent) => e.preventDefault()}
      >
        ${showHandle ? html`<ha-icon class="handle" icon="mdi:drag-vertical"></ha-icon>` : nothing}
        ${icon ? html`<ha-icon class="ico" .icon=${icon}></ha-icon>` : nothing}
        <div class="text">
          <span class="name">${name}</span>
          ${showState ? html`<span class="secondary">${item?.state ?? ""}</span>` : nothing}
        </div>
        ${showRank ? html`<span class="rank">${index + 1}</span>` : nothing}
        ${showArrows
          ? html`<span class="arrows">
              <ha-icon-button
                class="up"
                .disabled=${index === 0}
                label="Move up"
                @click=${() => this._move(index, index - 1)}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </ha-icon-button>
              <ha-icon-button
                class="down"
                .disabled=${index === total - 1}
                label="Move down"
                @click=${() => this._move(index, index + 1)}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </ha-icon-button>
            </span>`
          : nothing}
      </div>
    `;
  }

  static styles = css`
    ha-card {
      overflow: hidden;
    }

    .list {
      padding: 8px 0;
    }

    .row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      cursor: grab;
      transition:
        background-color 0.1s ease,
        opacity 0.15s ease;
    }

    .row + .row {
      border-top: 1px solid var(--divider-color);
    }

    .row:hover {
      background: var(--secondary-background-color);
    }

    .list.dragging .row:hover {
      background: transparent;
    }

    .row:active {
      cursor: grabbing;
    }

    .row.drag {
      opacity: 0.5;
    }

    .row.drop-before::before,
    .row.drop-after::after {
      content: "";
      position: absolute;
      left: 16px;
      right: 16px;
      height: 2px;
      border-radius: 2px;
      background: var(--primary-color);
    }

    .row.drop-before::before {
      top: -1px;
    }

    .row.drop-after::after {
      bottom: -1px;
    }

    .handle {
      color: var(--secondary-text-color);
      cursor: grab;
    }

    .ico {
      color: var(--state-icon-color, var(--primary-color));
      --mdc-icon-size: 24px;
    }

    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .name {
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .secondary {
      color: var(--secondary-text-color);
      font-size: 0.8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rank {
      color: var(--secondary-text-color);
      font-size: 14px;
      min-width: 18px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .arrows {
      display: flex;
    }

    ha-icon-button {
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    .empty,
    .warning {
      padding: 16px;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }

    .warning {
      color: var(--error-color, #f44336);
    }

    .warning code {
      font-family: var(--code-font-family, monospace);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "sortable-list-card": SortableListCard;
  }
}

export { type SortableListItemConfig } from "./types";
export type { SortableListCardConfig };
