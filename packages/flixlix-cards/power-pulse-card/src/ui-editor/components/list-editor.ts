import { mdiClose, mdiPencil, mdiPlus } from "@mdi/js";
import { fireEvent, type HomeAssistant } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

interface ListItem {
  entity?: string;
  name?: string;
  [key: string]: unknown;
}

declare global {
  interface HASSDomEvents {
    "flixlix-list-changed": { items: ListItem[] };
  }
}

@customElement("flixlix-list-editor")
export class FlixlixListEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) items: ListItem[] = [];
  @property({ attribute: false }) itemSchema: readonly unknown[] = [];
  @property({ type: String }) addLabel = "Add item";
  @property({ type: String }) singularLabel = "Item";
  @property({ type: String }) entityDomain = "sensor";

  @state() private _indexBeingEdited = -1;

  protected render() {
    if (this._indexBeingEdited !== -1 && this.items[this._indexBeingEdited]) {
      const idx = this._indexBeingEdited;
      const item = this.items[idx]!;
      const heading = item.name || item.entity || `${this.singularLabel} ${idx + 1}`;
      return html`
        <div class="edit-header">
          <span class="edit-title">${heading}</span>
          <ha-icon-button
            .label=${"Close"}
            .path=${mdiClose}
            @click=${() => (this._indexBeingEdited = -1)}
          ></ha-icon-button>
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${item}
          .schema=${this.itemSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onItemChanged}
        ></ha-form>
      `;
    }

    return html`
      <div class="list">
        ${this.items.length === 0
          ? html`<div class="empty">No ${this.singularLabel.toLowerCase()}s configured.</div>`
          : nothing}
        ${repeat(
          this.items,
          (_item, index) => index,
          (item, index) => html`
            <div class="row">
              <ha-entity-picker
                allow-custom-entity
                hideClearIcon
                .hass=${this.hass}
                .value=${item.entity ?? ""}
                .index=${index}
                @value-changed=${this._onEntityPickerChanged}
              ></ha-entity-picker>
              <ha-icon-button
                .label=${"Edit"}
                .path=${mdiPencil}
                class="action edit"
                @click=${() => this._editRow(index)}
              ></ha-icon-button>
              <ha-icon-button
                .label=${"Remove"}
                .path=${mdiClose}
                class="action remove"
                @click=${() => this._removeRow(index)}
              ></ha-icon-button>
            </div>
          `
        )}
        <button class="add" @click=${this._addRow}>
          <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
          <span>${this.addLabel}</span>
        </button>
      </div>
    `;
  }

  private _computeLabel = (schema: { name?: string; label?: string }): string => {
    return schema.label ?? schema.name ?? "";
  };

  private _addRow = (): void => {
    const next = [...this.items, { entity: "" } as ListItem];
    fireEvent(this, "flixlix-list-changed", { items: next });
    this._indexBeingEdited = next.length - 1;
  };

  private _removeRow(index: number): void {
    const next = [...this.items];
    next.splice(index, 1);
    fireEvent(this, "flixlix-list-changed", { items: next });
  }

  private _editRow(index: number): void {
    this._indexBeingEdited = index;
  }

  private _onItemChanged = (ev: CustomEvent): void => {
    const updated = ev.detail.value as ListItem;
    const next = [...this.items];
    next[this._indexBeingEdited] = updated;
    fireEvent(this, "flixlix-list-changed", { items: next });
  };

  private _onEntityPickerChanged = (ev: CustomEvent): void => {
    const target = ev.target as HTMLElement & { index?: number };
    const index = target.index ?? -1;
    if (index < 0) return;
    const value = ev.detail.value as string;
    const next = [...this.items];
    if (!value) {
      next.splice(index, 1);
    } else {
      next[index] = { ...(next[index] ?? {}), entity: value };
    }
    fireEvent(this, "flixlix-list-changed", { items: next });
  };

  static styles = css`
    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty {
      color: var(--secondary-text-color);
      font-size: 13px;
      padding: 8px 4px;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .row ha-entity-picker {
      flex: 1;
      min-width: 0;
    }

    .action {
      --mdc-icon-button-size: 36px;
      color: var(--secondary-text-color);
    }

    .action.remove:hover {
      color: var(--error-color, #d32f2f);
    }

    button.add {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      background: transparent;
      color: var(--primary-color);
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.3));
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      margin-top: 4px;
    }

    button.add:hover {
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }

    .edit-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .edit-title {
      font-size: 16px;
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-list-editor": FlixlixListEditor;
  }
}
