import { FlowLayoutController } from "@flixlix-cards/shared/components/flows/measure";
import {
  computeCardState,
  type CardState,
  energyReadings,
  watchedEntities,
} from "@flixlix-cards/shared/card-state";
import { flowCard } from "@flixlix-cards/shared/components/flow-card";
import { styles } from "@flixlix-cards/shared/style";
import {
  energyStatisticIds,
  gridImportIds,
} from "@flixlix-cards/shared/states/utils/statistic-ids";
import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
import { liveConditionContext } from "@flixlix-cards/shared/utils/condition-context";
import { EnergyPeriodController } from "@flixlix-cards/shared/utils/energy-period-controller";
import {
  assertRenderableFlowCardConfig,
  clickableEntitiesWithDefault,
  displayZeroLinesWithDefaults,
} from "@flixlix-cards/shared/utils/flow-card-config";
import { EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { defaultValues, getDefaultConfig } from "@flixlix-cards/shared/utils/get-default-config";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { cardShouldUpdate } from "@flixlix-cards/shared/utils/relevant-change";
import { SecondaryTemplates } from "@flixlix-cards/shared/utils/secondary-templates";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { WidthController } from "@flixlix-cards/shared/utils/width-controller";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { version } from "../package.json";
import { EnergyFlowCardPlusEditor } from "./ui-editor/ui-editor";

registerCustomCard({
  type: "energy-flow-card-plus",
  name: "Energy Flow Card Plus",
  description:
    "An extended version of the energy flow card with richer options, advanced features and a few small UI enhancements. Inspired by the Energy Dashboard.",
  version: version,
});

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

@customElement("energy-flow-card-plus")
export class EnergyFlowCardPlus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: EnergyFlowCardPlusConfig;
  private readonly _width = new WidthController(this, "#energy-flow-card-plus");
  @state() private _pageHidden = isPageHidden();
  private readonly _energy = new EnergyPeriodController(this, () => ({
    hass: this.hass,
    collectionKey: this._config?.collection_key,
    statisticIds: energyStatisticIds(this._config?.entities),
    fossil: this._fossilSource(),
  }));
  private _cardState?: CardState;
  private _appliedCardState?: CardState;
  private readonly _actions = new EntityActions(this, () => ({
    hass: this.hass,
    clickableEntities: this._config.clickable_entities,
  }));
  private readonly _flowLayout = new FlowLayoutController(this, "energy-flow-card-plus");
  private readonly _templates = new SecondaryTemplates(this, () => ({
    hass: this.hass,
    config: this._config,
  }));
  private _handleVisibilityChange = () => {
    this._pageHidden = isPageHidden();
  };

  setConfig(config: EnergyFlowCardPlusConfig): void {
    assertRenderableFlowCardConfig(config);
    this._config = {
      ...config,
      min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
      max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
      base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
      kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
      kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
      mega_threshold: coerceNumber(config.mega_threshold, defaultValues.megaThreshold),
      max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
      min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
      flow_rate_model: "relative",
      display_zero_lines: displayZeroLinesWithDefaults(config.display_zero_lines),
      clickable_entities: clickableEntitiesWithDefault(config.clickable_entities),
    };
  }

  public connectedCallback() {
    super.connectedCallback();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._handleVisibilityChange);
    }
  }

  public disconnectedCallback() {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    }
    super.disconnectedCallback();
  }

  public static getConfigElement(): LovelaceCardEditor {
    return new EnergyFlowCardPlusEditor();
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return getDefaultConfig(hass, "energy");
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    if (!this._config) {
      return true;
    }
    this._energy.subscribe();
    return cardShouldUpdate(changedProps, this.hass, watchedEntities(this._config));
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    if (changedProps.has("_config")) {
      void this._energy.refresh();
    }
    this._cardState = computeCardState({
      config: this._config,
      hass: this.hass,
      readings: energyReadings(
        this.hass,
        this._config,
        this._energy.growthMap,
        this._energy.fossilConsumption
      ),
      templates: this._templates.templates(this._config),
      conditionContext: liveConditionContext,
      width: this._width.width,
      pageHidden: this._pageHidden,
    });
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass) {
      return nothing;
    }
    if (!this._energy.window || cardState?.status !== "ready") {
      return html`<ha-card .header=${this._config.title}>
        <div class="card-content">
          ${
            this._energy.window
              ? this.hass.localize("ui.panel.lovelace.cards.energy.loading")
              : this.hass.localize("ui.panel.lovelace.cards.energy.no_data")
          }
        </div>
      </ha-card>`;
    }
    return flowCard(
      this._actions,
      this._config,
      cardState,
      this.hass,
      "energy-flow-card-plus",
      this._flowLayout.layout
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const cardState = this._cardState;
    if (cardState?.status === "ready" && cardState !== this._appliedCardState) {
      applyCardState(this, cardState);
      this._appliedCardState = cardState;
    }
  }

  /**
   * HA's energy collection only carries the period's fossil consumption when one of HA's own
   * energy cards is rendered on the page (a hidden date selector is not). Without it the card
   * would scale the whole period by the fossil sensor's live state.
   */
  private _fossilSource() {
    const entity = this._config?.entities.fossil_fuel_percentage?.entity;
    if (this._config?.energy_date_selection === false || !entity) {
      return undefined;
    }
    return { entity, gridImportIds: gridImportIds(this._config.entities.grid) };
  }

  static styles = styles;
}
