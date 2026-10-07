import { type Battery, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import {
  normalizeBatteries,
  serializeBatteries,
} from "@flixlix-cards/shared/utils/normalize-batteries";
import { fireEvent, type HomeAssistant } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement, type TemplateResult } from "lit";
import { property } from "lit-element";
import "./battery-row-editor";

export class BatteryDevicesEditor extends LitElement {
  public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: PowerFlowCardPlusConfig;

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html`<div>no config</div>`;
    }

    const batteries = normalizeBatteries(this.config.entities.battery);

    return html`
      <battery-row-editor
        .hass=${this.hass}
        .config=${this.config}
        .entities=${batteries}
        @entities-changed=${this._entitiesChanged}
        style="width: 100%;"
      ></battery-row-editor>
    `;
  }

  private _entitiesChanged(ev: CustomEvent): void {
    const batteries = (ev.detail.entities || []) as Battery[];
    const config = {
      ...this.config!,
      entities: {
        ...this.config!.entities,
        battery: serializeBatteries(batteries),
      },
    };

    fireEvent(this, "config-changed", { config });
  }

  static get styles(): CSSResultGroup {
    return css``;
  }
}

if (!customElements.get("battery-devices-editor")) {
  customElements.define("battery-devices-editor", BatteryDevicesEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    "battery-devices-editor": BatteryDevicesEditor;
  }
}
