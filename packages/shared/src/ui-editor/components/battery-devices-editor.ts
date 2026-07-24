import { type Battery, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { serializeBatteries, toBatteryList } from "@flixlix-cards/shared/utils/normalize-batteries";
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

    const batteries = toBatteryList(this.config.entities.battery);

    return html`
      <battery-row-editor
        .hass=${this.hass}
        .config=${this.config}
        .batteries=${batteries}
        @batteries-changed=${this._batteriesChanged}
        @config-changed=${this._valueChanged}
        style="width: 100%;"
      ></battery-row-editor>
    `;
  }

  private _valueChanged(ev: any): void {
    const config = ev.detail.value || ev.detail.config || "";
    if (!this.config || !this.hass) return;
    fireEvent(this, "config-changed", { config });
  }

  private _batteriesChanged(ev: CustomEvent<{ batteries: Battery[] }>): void {
    const config = {
      ...this.config,
      entities: {
        ...this.config.entities,
        battery: serializeBatteries(ev.detail.batteries),
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
