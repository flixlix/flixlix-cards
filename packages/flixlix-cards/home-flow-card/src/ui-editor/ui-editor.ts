import localize from "@flixlix-cards/shared/i18n";
import { fireEvent } from "@flixlix-cards/shared/ha/common/dom/fire-event";
import { type ComboEntity } from "@flixlix-cards/shared/types";
import { defineEditorElements } from "@flixlix-cards/shared/ui-editor/components/define-editor-elements";
import {
  computeEditorLabel,
  type HaFormLabelSchema,
  type ValueChangedEvent,
} from "@flixlix-cards/shared/ui-editor/ha-form";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { clickableEntitiesWithDefault } from "@flixlix-cards/shared/utils/flow-card-config";
import { formatNumber } from "@flixlix-cards/shared/utils/format-number";
import { type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";
import { isNumberValue, nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  DEFAULT_STATE_OF_CHARGE_SEVERITY,
  type HomeFlowCardConfig,
  type HomeFlowNodes,
} from "../types";
import {
  conditionsEditorAvailable,
  conditionsPanelStyles,
} from "@flixlix-cards/shared/ui-editor/components/conditions-panel";
import { carConditionsHtml } from "./car-conditions";
import {
  advancedSchema,
  CAR_CONDITIONS_AS_YAML,
  FIELD_DEFAULTS,
  generalSchema,
  NODE_SCHEMAS,
} from "./schema";

defineEditorElements();

type Node = keyof HomeFlowNodes | "generator" | "car" | "heat_pump";
type Page = Node | "advanced";

const NODE_PAGES: { page: Node; icon: string }[] = [
  { page: "grid", icon: "mdi:transmission-tower" },
  { page: "solar", icon: "mdi:solar-power" },
  { page: "battery", icon: "mdi:battery-high" },
  { page: "generator", icon: "mdi:engine" },
  { page: "home", icon: "mdi:home" },
  { page: "car", icon: "mdi:car-electric" },
  { page: "heat_pump", icon: "mdi:heat-pump" },
];

/** The entity ids a node reads: one, or one per direction. */
const entityIds = (entity: string | ComboEntity | undefined): string[] => {
  if (typeof entity === "string") {
    return entity === "" ? [] : [entity];
  }
  return [entity?.consumption, entity?.production].filter(
    (id): id is string => typeof id === "string" && id !== ""
  );
};

/** An entity's state as it reads, localized, with its unit. */
const reading = (hass: HomeAssistant, entityId: string | undefined): string | undefined => {
  const stateObj = entityId ? hass.states[entityId] : undefined;
  if (!stateObj) {
    return undefined;
  }
  const unit = stateObj.attributes.unit_of_measurement;
  const value = isNumberValue(stateObj.state)
    ? formatNumber(Number(stateObj.state), hass.locale)
    : stateObj.state;
  return typeof unit === "string" ? `${value} ${unit}` : value;
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

@customElement("home-flow-card-editor")
export class HomeFlowCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeFlowCardConfig;
  @state() private _page?: Page;

  public setConfig(config: HomeFlowCardConfig): void {
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
        ${this._form(
          {
            animate_numbers: true,
            ...this._config,
            clickable_entities: clickableEntitiesWithDefault(this._config.clickable_entities),
          },
          advancedSchema,
          this._valueChanged
        )}
      `;
    }
    const node = this._page;
    if (node === "car") {
      return this._carPage();
    }
    if (node) {
      const data =
        node === "battery"
          ? { state_of_charge_severity: DEFAULT_STATE_OF_CHARGE_SEVERITY, ...this._config.battery }
          : this._config[node];
      return html`
        <subpage-header @go-back=${this._goBack} page=${node}></subpage-header>
        ${this._form(data, NODE_SCHEMAS[node], (event) => this._nodeChanged(node, event.detail.value))}
      `;
    }
    return html`
      <div class="card-config">
        ${this._form(this._config, generalSchema, this._valueChanged)}
        <div class="pages">
          ${NODE_PAGES.map(({ page, icon }) => {
            const nodeConfig = this._config?.[page];
            return html`
              <link-subpage
                path=${page}
                header=${localize(`editor.${page}`)}
                secondary=${this._summary(page)}
                icon=${(nodeConfig && "icon" in nodeConfig ? nonEmpty(nodeConfig.icon) : undefined) ?? icon}
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

  private _form(
    data: unknown,
    schema: unknown,
    onChange: (event: ValueChangedEvent<Record<string, unknown>>) => void
  ) {
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${this._computeLabel}
      .computeHelper=${this._computeHelper}
      @value-changed=${onChange}
    ></ha-form>`;
  }

  /**
   * What a node's menu row shows under its name: its entities with their live readings, and the
   * battery's state of charge, so a wrong sensor shows without opening the page.
   */
  private _summary(page: Node): string {
    const node = this._config?.[page];
    const ids = entityIds(node?.entity);
    if (ids.length === 0) {
      return localize("editor.not_configured");
    }
    const readings = ids.map((id) => reading(this.hass, id)).filter(Boolean);
    const charge =
      page === "battery" ? reading(this.hass, this._config?.battery?.state_of_charge) : undefined;
    return [ids.join(" / "), ...readings, charge].filter(Boolean).join(" · ");
  }

  private _goBack = () => {
    this._page = undefined;
  };

  private _valueChanged = (event: ValueChangedEvent<Record<string, unknown>>): void => {
    fireEvent(this, "config-changed", { config: event.detail.value });
  };

  /** The car's fields, then its visibility and idle conditions in Home Assistant's own editor. */
  private _carPage() {
    const car = this._config?.car;
    const visual = conditionsEditorAvailable();
    const schema = visual ? NODE_SCHEMAS.car : [...NODE_SCHEMAS.car, ...CAR_CONDITIONS_AS_YAML];
    const onChange = (value: Record<string, unknown>) => this._nodeChanged("car", value);
    return html`
      <subpage-header @go-back=${this._goBack} page="car"></subpage-header>
      ${this._form(car, schema, (event) => onChange(event.detail.value))}
      ${visual ? carConditionsHtml(this.hass, car, onChange) : nothing}
    `;
  }

  private _nodeChanged(node: Node, nodeConfig: Record<string, unknown>) {
    if (!this._config) {
      return;
    }
    const value = node === "battery" ? withoutDefaultSeverity(nodeConfig) : nodeConfig;
    fireEvent(this, "config-changed", { config: { ...this._config, [node]: value } });
  }

  private _computeLabel = (schema: HaFormLabelSchema) => computeEditorLabel(this.hass, schema);

  private _computeHelper = (schema: HaFormLabelSchema) => {
    const fallback = FIELD_DEFAULTS[schema.name];
    return fallback ? `${localize("editor.default")}: ${fallback}` : undefined;
  };

  static styles = [
    conditionsPanelStyles,
    css`
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "home-flow-card-editor": HomeFlowCardEditor;
  }
}
