import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { type CardButton, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import {
  computeEditorLabel,
  type HaFormLabelSchema,
  type ValueChangedEvent,
} from "@flixlix-cards/shared/ui-editor/ha-form";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { sortableStyles } from "@flixlix-cards/shared/ui-editor/utils/sortable-styles";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { mdiClose, mdiDrag, mdiPencil, mdiPlus } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
// The default sortablejs build mounts the AutoScroll and OnSpill plugins.
import SortableJs, { type SortableEvent } from "sortablejs";
import { buttonSchema } from "../schema/button";

const DEFAULT_BUTTON_ICON = "mdi:gesture-tap-button";

/** The list of buttons at the bottom of the card: add, remove, reorder, and edit one at a time. */
export class ButtonsEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: FlowCardPlusConfig;

  @state() private _indexBeingEdited = -1;

  private _buttonKeys = new WeakMap<CardButton, string>();

  private _sortable?: SortableJs;

  /** Keeps the dragged row's DOM slot so lit's `repeat` can reorder from the original position. */
  private _dragPlaceholder?: Comment;

  public connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private get _buttons(): CardButton[] {
    return this.config?.buttons ?? [];
  }

  private _key(button: CardButton): string {
    let key = this._buttonKeys.get(button);
    if (key === undefined) {
      key = Math.random().toString();
      this._buttonKeys.set(button, key);
    }
    return key;
  }

  private _rowLabel(button: CardButton, index: number): string {
    const entityName = button.entity
      ? this.hass?.states[button.entity]?.attributes.friendly_name
      : undefined;
    return (
      nonEmpty(button.name) ??
      nonEmpty(entityName) ??
      nonEmpty(button.entity) ??
      `${localize("editor.button")} ${index + 1}`
    );
  }

  protected render() {
    const hass = this.hass;
    if (!hass || !this.config) {
      return html``;
    }
    const buttons = this._buttons;
    const edited = buttons[this._indexBeingEdited];

    if (edited) {
      return html`
        <div class="button-header">
          <h4>${this._indexBeingEdited + 1} / ${buttons.length} ${localize("editor.button")}</h4>
          <ha-icon-button
            .label=${hass.localize("ui.common.close")}
            .path=${mdiClose}
            class="close-icon"
            @click=${() => (this._indexBeingEdited = -1)}
          ></ha-icon-button>
        </div>
        <ha-form
          .hass=${hass}
          .data=${edited}
          .schema=${buttonSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._buttonChanged}
        ></ha-form>
      `;
    }

    return html`
      <div class="buttons">
        ${repeat(
          buttons,
          (button) => this._key(button),
          (button, index) => html`
            <div class="button-row">
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <ha-icon class="button-icon" .icon=${button.icon ?? DEFAULT_BUTTON_ICON}></ha-icon>
              <span class="button-label">${this._rowLabel(button, index)}</span>
              <ha-icon-button
                .label=${hass.localize("ui.common.delete")}
                .path=${mdiClose}
                class="remove-icon"
                @click=${() => this._writeButtons(buttons.filter((_, i) => i !== index))}
              ></ha-icon-button>
              <ha-icon-button
                .label=${hass.localize("ui.common.edit")}
                .path=${mdiPencil}
                class="edit-icon"
                @click=${() => (this._indexBeingEdited = index)}
              ></ha-icon-button>
            </div>
          `
        )}
      </div>
      <ha-button appearance="filled" size="small" class="add-button" @click=${this._addButton}>
        <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
        ${localize("editor.add_button")}
      </ha-button>
    `;
  }

  protected updated(): void {
    this._syncSortable();
  }

  /** The list element is re-created whenever the user returns from editing one button. */
  private _syncSortable(): void {
    const list = this.shadowRoot?.querySelector<HTMLElement>(".buttons") ?? undefined;
    if (this._sortable?.el === list) {
      return;
    }
    this._sortable?.destroy();
    this._sortable = list
      ? new SortableJs(list, {
          animation: 150,
          fallbackClass: "sortable-fallback",
          handle: ".handle",
          onChoose: (evt: SortableEvent) => {
            this._dragPlaceholder = document.createComment("sort-placeholder");
            evt.item.after(this._dragPlaceholder);
          },
          onEnd: (evt: SortableEvent) => {
            this._dragPlaceholder?.replaceWith(evt.item);
            this._dragPlaceholder = undefined;
            this._buttonMoved(evt.oldIndex, evt.newIndex);
          },
        })
      : undefined;
  }

  private _buttonMoved(from: number | undefined, to: number | undefined): void {
    const moved = from === undefined ? undefined : this._buttons[from];
    if (!moved || to === undefined || from === to) {
      return;
    }
    const buttons = this._buttons.filter((_, i) => i !== from);
    buttons.splice(to, 0, moved);
    this._writeButtons(buttons);
  }

  private _addButton = (): void => {
    const buttons = [...this._buttons, { icon: DEFAULT_BUTTON_ICON }];
    this._writeButtons(buttons);
    this._indexBeingEdited = buttons.length - 1;
  };

  private _buttonChanged = (ev: ValueChangedEvent<CardButton>): void => {
    ev.stopPropagation();
    const edited = this._indexBeingEdited;
    this._writeButtons(this._buttons.map((button, i) => (i === edited ? ev.detail.value : button)));
  };

  /** An empty list drops `buttons` from the YAML instead of leaving `buttons: []`. */
  private _writeButtons(buttons: CardButton[]): void {
    if (!this.config) {
      return;
    }
    const { buttons: _previous, ...rest } = this.config;
    const config = buttons.length > 0 ? { ...rest, buttons } : rest;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabel = (schema: HaFormLabelSchema) => computeEditorLabel(this.hass, schema);

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        .button-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-inline: 0.2rem;
          margin-bottom: 1rem;
        }

        .button-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 48px;
        }

        .handle {
          cursor: move;
          direction: var(--direction);
        }
        .handle > * {
          pointer-events: none;
        }

        .button-icon {
          color: var(--secondary-text-color);
        }

        .button-label {
          flex-grow: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove-icon,
        .edit-icon,
        .close-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }

        .add-button {
          margin-top: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "buttons-editor": ButtonsEditor;
  }
}
