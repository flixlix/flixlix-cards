import localize from "@flixlix-cards/shared/i18n";
import { type Battery, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { fireEvent } from "@flixlix-cards/shared/ui-editor/utils/fire-event";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { sortableStyles } from "@flixlix-cards/shared/ui-editor/utils/sortable-styles";
import {
  loadSortable,
  type SortableInstance,
} from "@flixlix-cards/shared/ui-editor/utils/sortable.ondemand";
import { mdiClose, mdiDrag, mdiPencil } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { SortableEvent } from "sortablejs";
import { batterySchema } from "../schema/battery";

export class BatteryRowEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected config?: PowerFlowCardPlusConfig;

  @property({ attribute: false }) protected entities?: Battery[];

  @property() protected label?: string;

  @state() protected _indexBeingEdited: number = -1;

  private _entityKeys = new WeakMap<object, string>();

  private _sortable?: SortableInstance;

  public connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._destroySortable();
  }

  private _getKey(action: object) {
    if (!this._entityKeys.has(action)) {
      this._entityKeys.set(action, Math.random().toString());
    }

    return this._entityKeys.get(action)!;
  }

  private _entityPickerValue(battery: Battery): string {
    if (typeof battery.entity === "string") return battery.entity;
    return battery.entity?.consumption || battery.entity?.production || "";
  }

  protected render() {
    if (!this.entities || !this.hass) {
      return html` <p>No batteries configured.</p> `;
    }

    if (this._indexBeingEdited !== -1) {
      return html`
        <div class="battery-header">
          <h4>
            ${this._indexBeingEdited + 1} / ${this.entities.length} ${localize("editor.battery")}
          </h4>
          <ha-icon-button
            .label=${this.hass!.localize("ui.components.entity.entity-picker.clear")}
            .path=${mdiClose}
            class="remove-icon"
            @click=${() => (this._indexBeingEdited = -1)}
          ></ha-icon-button>
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${this.entities[this._indexBeingEdited]}
          .schema=${batterySchema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._configChanged}
        ></ha-form>
      `;
    }

    return html`
      <div class="entities">
        ${repeat(
          this.entities,
          (entityConf) => this._getKey(entityConf),
          (entityConf, index) => html`
            <div class="entity">
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <ha-entity-picker
                allow-custom-entity
                hideClearIcon
                .hass=${this.hass}
                .value=${this._entityPickerValue(entityConf)}
                .index=${index}
                @value-changed=${this._valueChanged}
              ></ha-entity-picker>
              <ha-icon-button
                .label=${this.hass!.localize("ui.components.entity.entity-picker.clear")}
                .path=${mdiClose}
                class="remove-icon"
                .index=${index}
                @click=${this._removeRow}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize("ui.components.entity.entity-picker.edit")}
                .path=${mdiPencil}
                class="edit-icon"
                .index=${index}
                @click=${() => (this._indexBeingEdited = index)}
              ></ha-icon-button>
            </div>
          `
        )}
      </div>
      <ha-entity-picker
        class="add-entity"
        .hass=${this.hass}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  private _configChanged(ev: any): void {
    const newRowConfig = ev.detail.value || "";

    if (!this.config || !this.hass || !this.entities) {
      return;
    }

    const batteries = [...this.entities];
    batteries[this._indexBeingEdited] = newRowConfig;
    fireEvent(this, "entities-changed", { entities: batteries as any });
  }

  protected firstUpdated(): void {
    this._createSortable();
  }

  private _computeLabelCallback = (schema: any) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema?.name}`) ||
    localize(`editor.${schema?.name}`) ||
    schema?.label;

  private async _createSortable() {
    const Sortable = await loadSortable();
    const list = this.shadowRoot!.querySelector(".entities");
    if (!list) return;
    this._sortable = new Sortable(list, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onChoose: (evt: SortableEvent) => {
        (evt.item as any).placeholder = document.createComment("sort-placeholder");
        evt.item.after((evt.item as any).placeholder);
      },
      onEnd: (evt: SortableEvent) => {
        if ((evt.item as any).placeholder) {
          (evt.item as any).placeholder.replaceWith(evt.item);
          delete (evt.item as any).placeholder;
        }
        this._rowMoved(evt);
      },
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private async _addEntity(ev: CustomEvent): Promise<void> {
    const value = ev.detail.value;
    if (value === "") {
      return;
    }

    const newConfigEntities = (this.entities || []).concat({
      entity: value as string,
      color_circle: "color_dynamically",
    } as Battery);
    (ev.target as any).value = "";
    fireEvent(this, "entities-changed", { entities: newConfigEntities as any });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }
    if (ev.oldIndex == null || ev.newIndex == null) {
      return;
    }

    const newEntities = this.entities!.concat();
    const [movedEntity] = newEntities.splice(ev.oldIndex, 1);
    if (!movedEntity) {
      return;
    }
    newEntities.splice(ev.newIndex, 0, movedEntity);

    fireEvent(this, "entities-changed", { entities: newEntities as any });
  }

  private _removeRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newConfigEntities = this.entities!.concat();
    newConfigEntities.splice(index, 1);
    fireEvent(this, "entities-changed", { entities: newConfigEntities as any });
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const newConfigEntities = this.entities!.concat();

    if (value === "" || value === undefined) {
      newConfigEntities.splice(index, 1);
    } else {
      const current = newConfigEntities[index];
      if (!current) return;
      if (typeof current.entity === "object") {
        newConfigEntities[index] = {
          ...current,
          entity: {
            ...current.entity,
            consumption: value!,
          },
        };
      } else {
        newConfigEntities[index] = {
          ...current,
          entity: value!,
        };
      }
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities as any });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-entity-picker {
          margin-top: 8px;
        }

        .battery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-inline: 0.2rem;
          margin-bottom: 1rem;
        }

        .add-entity {
          display: block;
          margin-left: 31px;
          margin-right: 71px;
          margin-inline-start: 31px;
          margin-inline-end: 71px;
          direction: var(--direction);
        }
        .entity {
          display: flex;
          align-items: center;
        }

        .entity .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }
        .entity .handle > * {
          pointer-events: none;
        }

        .entity ha-entity-picker {
          flex-grow: 1;
          min-width: 0px;
        }

        .remove-icon,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

if (!customElements.get("battery-row-editor")) {
  customElements.define("battery-row-editor", BatteryRowEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    "battery-row-editor": BatteryRowEditor;
  }
}
