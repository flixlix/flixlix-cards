import { fireEvent, type HASSDomEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { html, LitElement, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";

export class IndividualDevicesEditor extends LitElement {
  public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: PowerFlowCardPlusConfig;

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html`<div>no config</div>`;
    }

    return html`
      <individual-row-editor
        .hass=${this.hass}
        .config=${this.config}
        .entities=${this.config.entities.individual ?? []}
        @entities-changed=${this._entitiesChanged}
        style="width: 100%;"
      ></individual-row-editor>
    `;
  }

  private _entitiesChanged = (ev: HASSDomEvent<HASSDomEvents["entities-changed"]>): void => {
    const config = {
      ...this.config,
      entities: {
        ...this.config.entities,
        individual: ev.detail.entities,
      },
    };

    fireEvent(this, "config-changed", { config });
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "individual-devices-editor": IndividualDevicesEditor;
  }
}
