import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import {
  type IndividualDeviceType,
  type PowerFlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import {
  computeEditorLabel,
  type HaFormLabelSchema,
  type ValueChangedEvent,
} from "@flixlix-cards/shared/ui-editor/ha-form";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { sortableStyles } from "@flixlix-cards/shared/ui-editor/utils/sortable-styles";
import { type Condition } from "@flixlix-cards/shared/card-state";
import { mdiClose, mdiDrag, mdiEyeOutline, mdiPencil } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
// The default sortablejs build mounts the AutoScroll and OnSpill plugins.
import SortableJs, { type SortableEvent } from "sortablejs";
import { individualSchema, individualVisibilityAsYaml } from "../schema/individual";
import {
  conditionsEditorAvailable,
  conditionsPanelHtml,
  conditionsPanelStyles,
} from "./conditions-panel";

/** Home Assistant's conditions editor hands back a list of conditions. */
const isConditionList = (value: unknown): value is Condition[] => Array.isArray(value);

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: IndividualDeviceType[];
    };
  }
}

export class IndividualRowEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected config?: PowerFlowCardPlusConfig;

  @property({ attribute: false }) protected entities?: IndividualDeviceType[];

  @property() protected label?: string;

  @state() protected _indexBeingEdited: number = -1;

  private _entityKeys = new WeakMap<IndividualDeviceType, string>();

  private _sortable?: SortableJs;

  /** Keeps the dragged row's DOM slot so lit's `repeat` can reorder from the original position. */
  private _dragPlaceholder?: Comment;

  public connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._destroySortable();
  }

  private _getKey(entity: IndividualDeviceType): string {
    let key = this._entityKeys.get(entity);
    if (key === undefined) {
      key = Math.random().toString();
      this._entityKeys.set(entity, key);
    }
    return key;
  }

  protected render() {
    const hass = this.hass;
    if (!this.entities || !hass) {
      return html` <p>No entities configured.</p> `;
    }

    if (this._indexBeingEdited !== -1) {
      const device = this.entities[this._indexBeingEdited];
      const visual = conditionsEditorAvailable();
      return html`
        <div class="individual-header">
          <h4>
            ${this._indexBeingEdited + 1} / ${this.entities.length} ${localize("editor.individual")}
          </h4>
          <ha-icon-button
            .label=${hass.localize("ui.components.entity.entity-picker.clear")}
            .path=${mdiClose}
            class="remove-icon"
            @click=${() => (this._indexBeingEdited = -1)}
          ></ha-icon-button>
        </div>
        <ha-form
          .hass=${hass}
          .data=${device}
          .schema=${visual ? individualSchema : [...individualSchema, individualVisibilityAsYaml]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${(ev: ValueChangedEvent<IndividualDeviceType>) =>
            this._deviceChanged(ev.detail.value)}
        ></ha-form>
        ${
          visual
            ? conditionsPanelHtml(hass, {
                key: "visibility",
                header: localize("editor.advanced"),
                label: localize("editor.visibility"),
                hint: localize("editor.individual_visibility_hint"),
                icon: mdiEyeOutline,
                conditions: device?.visibility ?? [],
                onChange: this._visibilityChanged,
              })
            : nothing
        }
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
                .hass=${hass}
                .value=${entityConf.entity}
                @value-changed=${(ev: ValueChangedEvent<string | undefined>) =>
                  this._valueChanged(index, ev.detail.value)}
              ></ha-entity-picker>
              <ha-icon-button
                .label=${hass.localize("ui.components.entity.entity-picker.clear")}
                .path=${mdiClose}
                class="remove-icon"
                @click=${() => this._removeRow(index)}
              ></ha-icon-button>
              <ha-icon-button
                .label=${hass.localize("ui.components.entity.entity-picker.edit")}
                .path=${mdiPencil}
                class="edit-icon"
                @click=${() => (this._indexBeingEdited = index)}
              ></ha-icon-button>
            </div>
          `
        )}
      </div>
      <ha-entity-picker
        class="add-entity"
        .hass=${hass}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  private _visibilityChanged = (conditions: unknown): void => {
    const device = this.entities?.[this._indexBeingEdited];
    if (!device) {
      return;
    }
    const { visibility: _old, ...rest } = device;
    // an empty list is left out, so the device always shows again
    this._deviceChanged(
      isConditionList(conditions) && conditions.length > 0
        ? { ...rest, visibility: conditions }
        : rest
    );
  };

  private _deviceChanged(device: IndividualDeviceType): void {
    if (!this.config || !this.hass) {
      return;
    }

    const current = this.config.entities.individual;
    const individualConfig = Array.isArray(current) ? [...current] : [];
    individualConfig[this._indexBeingEdited] = device;

    const config = {
      ...this.config,
      entities: {
        ...this.config.entities,
        individual: individualConfig,
      },
    };

    fireEvent(this, "config-changed", { config });
  }

  protected firstUpdated(): void {
    this._createSortable();
  }

  private _computeLabelCallback = (schema: HaFormLabelSchema) =>
    computeEditorLabel(this.hass, schema);

  private _createSortable() {
    const list = this.shadowRoot?.querySelector<HTMLElement>(".entities");
    if (!list) {
      return;
    }
    this._sortable = new SortableJs(list, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onChoose: (evt: SortableEvent) => {
        this._dragPlaceholder = document.createComment("sort-placeholder");
        evt.item.after(this._dragPlaceholder);
      },
      onEnd: (evt: SortableEvent) => {
        // put back in original location
        this._dragPlaceholder?.replaceWith(evt.item);
        this._dragPlaceholder = undefined;
        this._rowMoved(evt);
      },
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _addEntity = (ev: ValueChangedEvent<string>): void => {
    const value = ev.detail.value;
    if (value === "" || !this.entities) {
      return;
    }

    const newConfigEntities = this.entities.concat({ entity: value });
    const picker = ev.target;
    if (picker instanceof HTMLElement && "value" in picker) {
      picker.value = "";
    }
    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  };

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex || !this.entities) {
      return;
    }
    if (ev.oldIndex === undefined || ev.newIndex === undefined) {
      return;
    }

    const newEntities = this.entities.concat();
    const [movedEntity] = newEntities.splice(ev.oldIndex, 1);
    if (!movedEntity) {
      return;
    }
    newEntities.splice(ev.newIndex, 0, movedEntity);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _removeRow(index: number): void {
    if (!this.entities) {
      return;
    }
    const newConfigEntities = this.entities.concat();
    newConfigEntities.splice(index, 1);

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _valueChanged(index: number, value: string | undefined): void {
    if (!this.entities) {
      return;
    }
    const newConfigEntities = this.entities.concat();

    if (value === "" || value === undefined) {
      newConfigEntities.splice(index, 1);
    } else {
      newConfigEntities[index] = { ...newConfigEntities[index], entity: value };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      conditionsPanelStyles,
      css`
        ha-entity-picker {
          margin-top: 8px;
        }

        .individual-header {
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

declare global {
  interface HTMLElementTagNameMap {
    "individual-row-editor": IndividualRowEditor;
  }
}
