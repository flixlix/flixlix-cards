import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { type ComboEntity } from "@flixlix-cards/shared/types";
import { defineEditorElements } from "@flixlix-cards/shared/ui-editor/components/define-editor-elements";
import {
  computeEditorLabel,
  type HaFormLabelSchema,
  type ValueChangedEvent,
} from "@flixlix-cards/shared/ui-editor/ha-form";
import { batterySchema } from "@flixlix-cards/shared/ui-editor/schema/battery";
import { gridSchema } from "@flixlix-cards/shared/ui-editor/schema/grid";
import { homeSchema } from "@flixlix-cards/shared/ui-editor/schema/home";
import { solarSchema } from "@flixlix-cards/shared/ui-editor/schema/solar";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_STATE_OF_CHARGE_SEVERITY, type PowerFlowHouseCardConfig } from "../types";

defineEditorElements();

const percent = { number: { mode: "box", min: 0, max: 100, step: 1, unit_of_measurement: "%" } };
const decimals = { number: { mode: "box", min: 0, max: 5, step: 1 } };
const seconds = { number: { mode: "box", min: 0, step: 0.05, unit_of_measurement: "s" } };
const watts = { number: { mode: "box", min: 0, step: 1, unit_of_measurement: "W" } };

/** The battery's own fields, then where its charge bar turns red and yellow. */
const batteryPageSchema = [
  ...batterySchema,
  {
    type: "expandable",
    name: "state_of_charge_severity",
    title: localize("editor.state_of_charge_severity"),
    icon: "mdi:battery-heart-variant",
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "red", selector: percent },
          { name: "yellow", selector: percent },
        ],
      },
    ],
  },
] as const;

const ENTITY_PAGES = [
  { page: "grid", icon: "mdi:transmission-tower", schema: gridSchema },
  { page: "solar", icon: "mdi:solar-power", schema: solarSchema },
  { page: "battery", icon: "mdi:battery-high", schema: batteryPageSchema },
  { page: "home", icon: "mdi:home", schema: homeSchema },
] as const;

type EntityPage = (typeof ENTITY_PAGES)[number]["page"];
type Page = EntityPage | "advanced";

export const generalSchema = [{ name: "title", selector: { text: {} } }] as const;

/** Everything but the title, grouped by what it changes; unnamed groups keep their fields flat. */
export const advancedSchema = [
  {
    type: "expandable",
    title: localize("editor.animation"),
    icon: "mdi:animation-play",
    expanded: true,
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "animate_numbers", selector: { boolean: {} } },
          { name: "disable_dots", selector: { boolean: {} } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "min_flow_rate", selector: seconds },
          { name: "max_flow_rate", selector: seconds },
          { name: "min_expected_power", selector: watts },
          { name: "max_expected_power", selector: watts },
        ],
      },
    ],
  },
  {
    type: "expandable",
    title: localize("editor.number_format"),
    icon: "mdi:decimal",
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "base_decimals", selector: decimals },
          { name: "kilo_decimals", selector: decimals },
          { name: "kilo_threshold", selector: watts },
        ],
      },
    ],
  },
  {
    type: "expandable",
    title: localize("editor.interaction"),
    icon: "mdi:gesture-tap",
    schema: [{ name: "clickable_entities", selector: { boolean: {} } }],
  },
] as const;

/** The entity a page is set to, as the menu shows it. */
const entitySummary = (entity: string | ComboEntity | undefined): string | undefined => {
  if (typeof entity === "string") {
    return nonEmpty(entity);
  }
  const parts = [entity?.consumption, entity?.production].filter(
    (part): part is string => typeof part === "string" && part !== ""
  );
  return parts.length > 0 ? parts.join(" / ") : undefined;
};

const isSeverity = (value: unknown): value is ChargeSeverity =>
  typeof value === "object" && value !== null;

/** Drops thresholds that only repeat the defaults, so an untouched config stays short. */
const withoutDefaultSeverity = (battery: Record<string, unknown>) => {
  const { state_of_charge_severity: severity, ...rest } = battery;
  const isDefault =
    isSeverity(severity) &&
    severity.red === DEFAULT_STATE_OF_CHARGE_SEVERITY.red &&
    severity.yellow === DEFAULT_STATE_OF_CHARGE_SEVERITY.yellow;
  return isDefault ? rest : battery;
};

@customElement("power-flow-house-card-editor")
export class PowerFlowHouseCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: PowerFlowHouseCardConfig;
  @state() private _page?: Page;

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
    if (this._page === "advanced") {
      return html`
        <subpage-header @go-back=${this._goBack} page="advanced"></subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${{ animate_numbers: true, ...this._config }}
          .schema=${advancedSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
    const entityPage = ENTITY_PAGES.find(({ page }) => page === this._page);
    if (entityPage) {
      const data =
        entityPage.page === "battery"
          ? {
              state_of_charge_severity: DEFAULT_STATE_OF_CHARGE_SEVERITY,
              ...this._config.entities.battery,
            }
          : this._config.entities[entityPage.page];
      return html`
        <subpage-header @go-back=${this._goBack} page=${entityPage.page}></subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${data}
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
          .data=${this._config}
          .schema=${generalSchema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="pages">
          ${ENTITY_PAGES.map(({ page, icon }) => {
            const entity = this._config?.entities[page];
            return html`
              <link-subpage
                path=${page}
                header=${localize(`editor.${page}`)}
                secondary=${entitySummary(entity?.entity) ?? localize("editor.not_configured")}
                icon=${nonEmpty(entity?.icon) ?? icon}
                @open-sub-element-editor=${() => (this._page = page)}
              ></link-subpage>
            `;
          })}
          <link-subpage
            path="advanced"
            header=${localize("editor.advanced")}
            icon="mdi:cog"
            @open-sub-element-editor=${() => (this._page = "advanced")}
          ></link-subpage>
        </div>
      </div>
    `;
  }

  private _goBack = () => {
    this._page = undefined;
  };

  private _valueChanged = (event: ValueChangedEvent<PowerFlowHouseCardConfig>): void => {
    fireEvent(this, "config-changed", { config: event.detail.value });
  };

  private _entityChanged(page: EntityPage, event: ValueChangedEvent<Record<string, unknown>>) {
    if (!this._config) {
      return;
    }
    const value =
      page === "battery" ? withoutDefaultSeverity(event.detail.value) : event.detail.value;
    const config = {
      ...this._config,
      entities: { ...this._config.entities, [page]: value },
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
      gap: 1rem;
      margin-bottom: 10px;
    }

    .pages {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-house-card-editor": PowerFlowHouseCardEditor;
  }
}
