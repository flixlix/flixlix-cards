import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { defineEditorElements } from "@flixlix-cards/shared/ui-editor/components/define-editor-elements";
import {
  computeEditorLabel,
  type HaFormLabelSchema,
  type ValueChangedEvent,
} from "@flixlix-cards/shared/ui-editor/ha-form";
import { batterySchema } from "@flixlix-cards/shared/ui-editor/schema/battery";
import { nonFossilSchema } from "@flixlix-cards/shared/ui-editor/schema/fossil-fuel-percentage";
import { gridSchema } from "@flixlix-cards/shared/ui-editor/schema/grid";
import { homeSchema } from "@flixlix-cards/shared/ui-editor/schema/home";
import { solarSchema } from "@flixlix-cards/shared/ui-editor/schema/solar";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type PowerFlowHouseCardConfig } from "../types";

defineEditorElements();

const ENTITY_PAGES = [
  { page: "grid", icon: "mdi:transmission-tower", schema: gridSchema },
  { page: "solar", icon: "mdi:solar-power", schema: solarSchema },
  { page: "battery", icon: "mdi:battery-high", schema: batterySchema },
  { page: "fossil_fuel_percentage", icon: "mdi:leaf", schema: nonFossilSchema },
  { page: "home", icon: "mdi:home", schema: homeSchema },
] as const;

type EntityPage = (typeof ENTITY_PAGES)[number]["page"];

const decimals = { number: { mode: "box", min: 0, max: 5, step: 1 } };

export const generalSchema = [
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "animate_numbers", selector: { boolean: {} } },
      { name: "clickable_entities", selector: { boolean: {} } },
      { name: "disable_dots", selector: { boolean: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "base_decimals", selector: decimals },
      { name: "kilo_decimals", selector: decimals },
      { name: "kilo_threshold", selector: { number: { mode: "box", min: 0, step: 1 } } },
    ],
  },
] as const;

@customElement("power-flow-house-card-editor")
export class PowerFlowHouseCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: PowerFlowHouseCardConfig;
  @state() private _page?: EntityPage;

  public setConfig(config: PowerFlowHouseCardConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm().then(() => this.requestUpdate());
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const entityPage = ENTITY_PAGES.find(({ page }) => page === this._page);
    if (entityPage) {
      return html`
        <subpage-header @go-back=${() => (this._page = undefined)} page=${entityPage.page}>
        </subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${this._config.entities[entityPage.page]}
          .schema=${entityPage.schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${(event: ValueChangedEvent<Record<string, unknown>>) =>
            this._entityChanged(entityPage.page, event)}
        ></ha-form>
      `;
    }
    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${{ animate_numbers: true, ...this._config }}
          .schema=${generalSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${ENTITY_PAGES.map(
          ({ page, icon }) => html`
            <link-subpage
              path=${page}
              header=${localize(`editor.${page}`)}
              icon=${nonEmpty(this._config?.entities[page]?.icon) ?? icon}
              @open-sub-element-editor=${() => (this._page = page)}
            ></link-subpage>
          `
        )}
      </div>
    `;
  }

  private _valueChanged = (event: ValueChangedEvent<PowerFlowHouseCardConfig>): void => {
    fireEvent(this, "config-changed", { config: event.detail.value });
  };

  private _entityChanged(page: EntityPage, event: ValueChangedEvent<Record<string, unknown>>) {
    if (!this._config) {
      return;
    }
    const config = {
      ...this._config,
      entities: { ...this._config.entities, [page]: event.detail.value },
    };
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabel = (schema: HaFormLabelSchema) => computeEditorLabel(this.hass, schema);

  static styles = css`
    ha-form {
      width: 100%;
    }

    .card-config {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 10px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-house-card-editor": PowerFlowHouseCardEditor;
  }
}
