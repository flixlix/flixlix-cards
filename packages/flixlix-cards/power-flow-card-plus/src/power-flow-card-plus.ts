import { FlowLayoutController } from "@flixlix-cards/shared/components/flows/measure";
import {
  computeCardState,
  type CardState,
  powerReadings,
  visibilityConditions,
  watchedEntities,
} from "@flixlix-cards/shared/card-state";
import { flowCard, flowCardGridOptions } from "@flixlix-cards/shared/components/flow-card";
import { styles } from "@flixlix-cards/shared/style";
import {
  type LovelaceGridOptions,
  type PowerFlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
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
import { ServerConditionsController } from "@flixlix-cards/shared/utils/server-conditions";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { WidthController } from "@flixlix-cards/shared/utils/width-controller";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { version } from "../package.json";
import { PowerFlowCardPlusEditor } from "./ui-editor/ui-editor";

registerCustomCard({
  type: "power-flow-card-plus",
  name: "Power Flow Card Plus",
  description:
    "An extended version of the power flow card with richer options, advanced features and a few small UI enhancements. Inspired by the Energy Dashboard.",
  version: version,
});

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

@customElement("power-flow-card-plus")
export class PowerFlowCardPlus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: PowerFlowCardPlusConfig;
  private readonly _width = new WidthController(this, "#power-flow-card-plus");
  @state() private _pageHidden = isPageHidden();
  private _cardState?: CardState;
  private _appliedCardState?: CardState;
  private readonly _actions = new EntityActions(this, () => ({
    hass: this.hass,
    clickableEntities: this._config.clickable_entities,
  }));
  private readonly _flowLayout = new FlowLayoutController(this, "power-flow-card-plus");
  private readonly _conditions = new ServerConditionsController(this, () => ({
    hass: this.hass,
    conditions: this._config ? visibilityConditions(this._config) : [],
  }));
  private readonly _templates = new SecondaryTemplates(this, () => ({
    hass: this.hass,
    config: this._config,
  }));
  private _handleVisibilityChange = () => {
    this._pageHidden = isPageHidden();
  };

  setConfig(config: PowerFlowCardPlusConfig): void {
    assertRenderableFlowCardConfig(config);
    this._config = {
      ...config,
      min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
      max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
      base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
      kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
      kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
      max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
      min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
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
    return new PowerFlowCardPlusEditor();
  }

  public static getStubConfig(hass: HomeAssistant): Promise<object> {
    return getDefaultConfig(hass, "power");
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public getGridOptions(): LovelaceGridOptions {
    return flowCardGridOptions();
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return cardShouldUpdate(
      changedProps,
      this.hass,
      this._config ? watchedEntities(this._config) : []
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    this._conditions.sync();
    this._cardState = computeCardState({
      config: this._config,
      hass: this.hass,
      readings: powerReadings(this.hass, this._config),
      templates: this._templates.templates(this._config),
      conditionContext: this._conditions.context,
      width: this._width.width,
      pageHidden: this._pageHidden,
    });
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass || cardState?.status !== "ready") {
      return nothing;
    }
    return flowCard(
      this._actions,
      this._config,
      cardState,
      this.hass,
      "power-flow-card-plus",
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

  static styles = styles;
}
