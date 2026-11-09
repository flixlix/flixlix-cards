import { flowRateModel } from "@flixlix-cards/shared/card-state";
import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { type ConfigPage, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
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
import { dropSpreadEntity } from "@flixlix-cards/shared/ui-editor/utils/drop-spread-entity";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { advancedOptionsSchema, cardConfigStruct, generalConfigSchema } from "./schema/_schema-all";

defineEditorElements();

const ENTITY_PAGES = [
  { page: "grid", icon: "mdi:transmission-tower", schema: gridSchema },
  { page: "solar", icon: "mdi:solar-power", schema: solarSchema },
  { page: "battery", icon: "mdi:battery-high", schema: batterySchema },
  { page: "fossil_fuel_percentage", icon: "mdi:leaf", schema: nonFossilSchema },
  { page: "home", icon: "mdi:home", schema: homeSchema },
] as const;

type EntityPage = (typeof ENTITY_PAGES)[number]["page"];
type MenuPage = EntityPage | "individual" | "advanced";

const MENU_PAGES: readonly { page: MenuPage; icon: string }[] = [
  ...ENTITY_PAGES,
  { page: "individual", icon: "mdi:dots-horizontal-circle-outline" },
  { page: "advanced", icon: "mdi:cog" },
];

@customElement("power-flow-card-plus-editor")
export class PowerFlowCardPlusEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: PowerFlowCardPlusConfig;
  @state() private _currentConfigPage: ConfigPage = null;

  public setConfig(config: PowerFlowCardPlusConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm();
  }

  private _goBack = (): void => {
    this._currentConfigPage = null;
  };

  private _hasLegacyFields(): boolean {
    if (!this._config) {
      return false;
    }
    return (
      this._config.watt_threshold !== undefined ||
      this._config.w_decimals !== undefined ||
      this._config.kw_decimals !== undefined
    );
  }

  private _migrateLegacyFields = (): void => {
    if (!this._config) {
      return;
    }
    const config: PowerFlowCardPlusConfig = { ...this._config };

    if (typeof config.watt_threshold === "number" && config.kilo_threshold === undefined) {
      config.kilo_threshold = config.watt_threshold;
    }
    if (typeof config.w_decimals === "number" && config.base_decimals === undefined) {
      config.base_decimals = config.w_decimals;
    }
    if (typeof config.kw_decimals === "number" && config.kilo_decimals === undefined) {
      config.kilo_decimals = config.kw_decimals;
    }

    delete config.watt_threshold;
    delete config.w_decimals;
    delete config.kw_decimals;

    this._config = config;
    fireEvent(this, "config-changed", { config });
  };

  private _renderLegacyFieldsAlert() {
    if (!this._hasLegacyFields()) {
      return nothing;
    }
    return html`
      <ha-alert class="legacy-fields-alert" alert-type="warning">
        Legacy config fields detected. Field names changed: w_decimals -> base_decimals, kw_decimals
        -> kilo_decimals, watt_threshold -> kilo_threshold.<br />
        More info: https://github.com/flixlix/power-flow-card-plus/releases/tag/v0.3.5
        <button
          class="legacy-fields-alert-button"
          slot="action"
          @click=${this._migrateLegacyFields}
        >
          Convert automatically
        </button>
      </ha-alert>
    `;
  }

  private _hasLegacyIndividualFields(): boolean {
    if (!this._config) {
      return false;
    }
    const entities = this._config.entities;
    return entities.individual1 !== undefined || entities.individual2 !== undefined;
  }

  private _migrateLegacyIndividualFields = (): void => {
    if (!this._config) {
      return;
    }
    const entities = { ...this._config.entities };
    const current = Array.isArray(entities.individual) ? entities.individual : [];
    // Legacy slots hold either one device or a list of them; flatMap accepts both.
    const legacy = [entities.individual1, entities.individual2].flatMap((value) => value ?? []);

    entities.individual = [...current, ...legacy];
    delete entities.individual1;
    delete entities.individual2;

    const config = { ...this._config, entities };
    this._config = config;
    fireEvent(this, "config-changed", { config });
  };

  private _renderLegacyIndividualFieldsAlert() {
    if (!this._hasLegacyIndividualFields()) {
      return nothing;
    }
    return html`
      <ha-alert class="legacy-fields-alert" alert-type="warning">
        Legacy individual fields detected. Field names changed: entities.individual1/individual2 ->
        entities.individual[].
        <button
          class="legacy-fields-alert-button"
          slot="action"
          @click=${this._migrateLegacyIndividualFields}
        >
          Convert automatically
        </button>
      </ha-alert>
    `;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const data = {
      ...this._config,
      display_zero_lines: {
        mode: this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode,
        transparency:
          this._config.display_zero_lines?.transparency ??
          defaultValues.displayZeroLines.transparency,
        grey_color:
          this._config.display_zero_lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
        grey_out_circles: this._config.display_zero_lines?.grey_out_circles ?? false,
      },
    };
    const alerts = html`${this._renderLegacyFieldsAlert()}${this._renderLegacyIndividualFieldsAlert()}`;
    const currentPage = this._currentConfigPage;

    if (currentPage === "individual") {
      return html`
        ${alerts}
        <subpage-header @go-back=${this._goBack} page=${currentPage}> </subpage-header>
        <individual-devices-editor
          .hass=${this.hass}
          .config=${this._config}
        ></individual-devices-editor>
      `;
    }

    if (currentPage === "advanced") {
      return html`
        ${alerts}
        <subpage-header @go-back=${this._goBack} page=${currentPage}> </subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${{ ...data, flow_rate_model: flowRateModel(this._config) }}
          .schema=${advancedOptionsSchema(
            this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode
          )}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._advancedChanged}
        ></ha-form>
      `;
    }

    const entityPage = ENTITY_PAGES.find(({ page }) => page === currentPage);
    if (entityPage) {
      return html`
        ${alerts}
        <subpage-header @go-back=${this._goBack} page=${entityPage.page}> </subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${data.entities[entityPage.page]}
          .schema=${entityPage.schema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${(ev: ValueChangedEvent<Record<string, unknown>>) =>
            this._entityChanged(entityPage.page, ev)}
        ></ha-form>
      `;
    }

    return html`
      <div class="card-config">
        ${alerts}
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${generalConfigSchema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${MENU_PAGES.map(
          ({ page, icon }) => html`
            <link-subpage
              path=${page}
              header="${localize(`editor.${page}`)}"
              @open-sub-element-editor=${() => (this._currentConfigPage = page)}
              icon=${this._menuIcon(page, icon)}
            >
            </link-subpage>
          `
        )}
      </div>
    `;
  }

  private _menuIcon(page: MenuPage, fallbackIcon: string): string {
    if (page === "individual" || page === "advanced" || !this._config) {
      return fallbackIcon;
    }
    return nonEmpty(this._config.entities[page]?.icon) ?? fallbackIcon;
  }

  private _valueChanged = (ev: ValueChangedEvent<PowerFlowCardPlusConfig>): void => {
    if (!this._config || !this.hass) {
      return;
    }
    fireEvent(this, "config-changed", { config: ev.detail.value });
  };

  /** The form always carries `flow_rate_model`, which supersedes the older alias. */
  private _advancedChanged = (ev: ValueChangedEvent<PowerFlowCardPlusConfig>): void => {
    if (!this._config || !this.hass) {
      return;
    }
    const { use_new_flow_rate_model: _alias, ...config } = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  };

  private _entityChanged(page: EntityPage, ev: ValueChangedEvent<Record<string, unknown>>): void {
    if (!this._config || !this.hass) {
      return;
    }
    const config = {
      ...this._config,
      entities: { ...this._config.entities, [page]: dropSpreadEntity(ev.detail.value) },
    };
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormLabelSchema) =>
    computeEditorLabel(this.hass, schema);

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .entities-section * {
        background-color: #f00;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 10px;
      }

      .legacy-fields-alert {
        margin-bottom: 8px;
      }

      .legacy-fields-alert-button {
        border: none;
        background: var(--warning-color);
        border-radius: 99px;
        color: var(--card-background-color);
        cursor: pointer;
        font: inherit;
        padding: 4px 8px;
      }

      .config-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .config-header.sub-header {
        margin-top: 24px;
      }

      ha-icon {
        padding-bottom: 2px;
        position: relative;
        top: -4px;
        right: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-card-plus-editor": PowerFlowCardPlusEditor;
  }
}
