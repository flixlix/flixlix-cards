import { type ConfigPage, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { BaseCardEditor } from "@flixlix-cards/shared/ui-editor/base-editor";
import "@flixlix-cards/shared/ui-editor/components/individual-devices-editor";
import "@flixlix-cards/shared/ui-editor/components/link-subpage";
import "@flixlix-cards/shared/ui-editor/components/subpage-header";
import { batterySchema } from "@flixlix-cards/shared/ui-editor/schema/battery";
import { nonFossilSchema } from "@flixlix-cards/shared/ui-editor/schema/fossil-fuel-percentage";
import { gridSchema } from "@flixlix-cards/shared/ui-editor/schema/grid";
import { homeSchema } from "@flixlix-cards/shared/ui-editor/schema/home";
import { solarSchema } from "@flixlix-cards/shared/ui-editor/schema/solar";
import { fireEvent } from "custom-card-helpers";
import { html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { type Struct } from "superstruct";
import { advancedOptionsSchema, cardConfigStruct, generalConfigSchema } from "./schema/_schema-all";

const CONFIG_PAGES: {
  page: ConfigPage;
  icon?: string;
  schema?: any;
}[] = [
  {
    page: "grid",
    icon: "mdi:transmission-tower",
    schema: gridSchema,
  },
  {
    page: "solar",
    icon: "mdi:solar-power",
    schema: solarSchema,
  },
  {
    page: "battery",
    icon: "mdi:battery-high",
    schema: batterySchema,
  },
  {
    page: "fossil_fuel_percentage",
    icon: "mdi:leaf",
    schema: nonFossilSchema,
  },
  {
    page: "home",
    icon: "mdi:home",
    schema: homeSchema,
  },
  {
    page: "individual",
    icon: "mdi:dots-horizontal-circle-outline",
  },
  {
    page: "advanced",
    icon: "mdi:cog",
    schema: advancedOptionsSchema,
  },
];

@customElement("power-flow-card-plus-editor")
export class PowerFlowCardPlusEditor extends BaseCardEditor<PowerFlowCardPlusConfig> {
  protected get configStruct(): Struct<PowerFlowCardPlusConfig, any> {
    return cardConfigStruct as unknown as Struct<PowerFlowCardPlusConfig, any>;
  }

  protected get configPages() {
    return CONFIG_PAGES;
  }

  protected get generalSchema() {
    return generalConfigSchema;
  }

  protected advancedSchema(localizeFn: (key: string) => string, displayZeroLinesMode: string) {
    return advancedOptionsSchema(localizeFn, displayZeroLinesMode);
  }

  private _hasLegacyFields(): boolean {
    if (!this._config) return false;
    return (
      this._config.watt_threshold !== undefined ||
      this._config.w_decimals !== undefined ||
      this._config.kw_decimals !== undefined
    );
  }

  private _migrateLegacyFields(): void {
    if (!this._config) return;
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
  }

  private _renderLegacyFieldsAlert(): TemplateResult | typeof nothing {
    if (!this._hasLegacyFields()) return nothing;
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
    if (!this._config) return false;
    const entities = this._config.entities as PowerFlowCardPlusConfig["entities"] & {
      individual1?: unknown;
      individual2?: unknown;
    };
    return entities.individual1 !== undefined || entities.individual2 !== undefined;
  }

  private _migrateLegacyIndividualFields(): void {
    if (!this._config) return;
    const config = {
      ...this._config,
      entities: { ...this._config.entities },
    } as PowerFlowCardPlusConfig & {
      entities: PowerFlowCardPlusConfig["entities"] & {
        individual1?: unknown;
        individual2?: unknown;
      };
    };
    const individual = Array.isArray(config.entities.individual)
      ? [...config.entities.individual]
      : [];

    const appendLegacy = (value: unknown) => {
      if (Array.isArray(value)) {
        individual.push(...value);
        return;
      }
      if (value !== undefined) {
        individual.push(value as any);
      }
    };

    appendLegacy(config.entities.individual1);
    appendLegacy(config.entities.individual2);

    config.entities.individual = individual;
    delete config.entities.individual1;
    delete config.entities.individual2;

    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  private _renderLegacyIndividualFieldsAlert(): TemplateResult | typeof nothing {
    if (!this._hasLegacyIndividualFields()) return nothing;
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

  protected _renderLegacyAlerts(): TemplateResult | typeof nothing {
    const legacy = this._renderLegacyFieldsAlert();
    const individual = this._renderLegacyIndividualFieldsAlert();
    if (legacy === nothing && individual === nothing) return nothing;
    return html`${legacy}${individual}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-card-plus-editor": PowerFlowCardPlusEditor;
  }
}
