import {
  computeCardState,
  type CardState,
  energyReader,
  energyReadings,
  type EntityReader,
  powerReadings,
  type Readings,
  watchedEntities,
  wattsReader,
} from "@flixlix-cards/shared/card-state";
import { energyStatisticIds } from "@flixlix-cards/shared/states/utils/statistic-ids";
import { EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
import { liveConditionContext } from "@flixlix-cards/shared/utils/condition-context";
import { EnergyPeriodController } from "@flixlix-cards/shared/utils/energy-period-controller";
import {
  assertRenderableFlowCardConfig,
  clickableEntitiesWithDefault,
  displayZeroLinesWithDefaults,
} from "@flixlix-cards/shared/utils/flow-card-config";
import { defaultValues, getDefaultConfig } from "@flixlix-cards/shared/utils/get-default-config";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { cardShouldUpdate } from "@flixlix-cards/shared/utils/relevant-change";
import { SecondaryTemplates } from "@flixlix-cards/shared/utils/secondary-templates";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { WidthController } from "@flixlix-cards/shared/utils/width-controller";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import NumberFlow, { canAnimate } from "number-flow";
import { version } from "../package.json";
import { HomeFlowCardEditor } from "./ui-editor/ui-editor";
import { carImage, type CarImage, carResolution, readCarPalette } from "./car-image";
import { carEntities, carScene, type CarStatus, carStatus } from "./car-node";
import { drawHouse } from "./draw-house";
import { heatPumpEntities } from "./heat-pump-node";
import { fitLabels, wireScale } from "./label-size";
import { labelsHtml } from "./render-labels";
import { gridFade, keepPulsePhase } from "./render-wires";
import { styles } from "./styles";
import { type FlowConfig, fromEntities, type HomeFlowCardConfig, toFlowConfig } from "./types";
import { unitSlide } from "./unit-slide";
import { morphWord } from "./word-morph";

registerCustomCard({
  type: "home-flow-card",
  name: "Home Flow Card",
  description:
    "Power or energy flows drawn on an isometric house: solar on the roof, a battery on the wall and every wire running through the inverter.",
  version: version,
});

/** Home Assistant's `hass.themes.darkMode`, which custom-card-helpers' types leave out. */
const isDarkMode = (hass: HomeAssistant): boolean => {
  const themes: unknown = hass.themes;
  return (
    typeof themes === "object" &&
    themes !== null &&
    "darkMode" in themes &&
    themes.darkMode === true
  );
};

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

const isEnergy = (config: FlowConfig) => config.mode === "energy";

/** Every statistic an energy card reads, the fixtures only this card draws included. */
const statisticIds = (config: FlowConfig) =>
  energyStatisticIds(config.entities, [
    config.generator?.entity,
    config.car?.entity,
    config.heat_pump?.entity,
  ]);

@customElement("home-flow-card")
export class HomeFlowCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  /** The config in the `entities` shape the shared pipeline reads, with defaults filled in. */
  @state() private _config!: FlowConfig;
  private readonly _width = new WidthController(this, ".stage > svg");
  private readonly _energy = new EnergyPeriodController(this, () =>
    this._config && isEnergy(this._config)
      ? {
          hass: this.hass,
          collectionKey: this._config.collection_key,
          statisticIds: statisticIds(this._config),
        }
      : null
  );
  @state() private _pageHidden = isPageHidden();
  private _cardState?: CardState;
  /** Reads the fixtures' entities as the nodes' are read: in W, or in Wh over the period. */
  private _read: EntityReader = () => null;
  /** The car, drawn for the current theme and size. */
  private _carImage: CarImage | null = null;
  private _carStatus: CarStatus = "hidden";
  private _appliedCardState?: CardState;
  private readonly _pulseDurations = new WeakMap<Element, number>();
  private _unitSlide?: ReturnType<typeof unitSlide>;
  private readonly _actions = new EntityActions(this, () => ({
    hass: this.hass,
    clickableEntities: this._config.clickable_entities,
  }));
  private readonly _templates = new SecondaryTemplates(this, () => ({
    hass: this.hass,
    config: this._config,
  }));
  private _handleVisibilityChange = () => {
    this._pageHidden = isPageHidden();
  };

  setConfig(cardConfig: HomeFlowCardConfig): void {
    const config = toFlowConfig(cardConfig);
    assertRenderableFlowCardConfig(config);
    this._config = {
      ...config,
      min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
      max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
      base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
      kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
      kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
      mega_threshold: coerceNumber(config.mega_threshold, defaultValues.megaThreshold),
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
    return new HomeFlowCardEditor();
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return fromEntities(getDefaultConfig(hass, "power"));
  }

  public getCardSize(): number {
    return 6;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    this._energy.subscribe();
    return cardShouldUpdate(
      changedProps,
      this.hass,
      this._config
        ? [
            ...watchedEntities(this._config),
            ...carEntities(this._config.car),
            ...heatPumpEntities(this._config.heat_pump),
          ]
        : []
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    // where each unit sits before this render, so it can slide to where it sits after
    this._unitSlide =
      this.shadowRoot && this._animatesNumbers() && !prefersReducedMotion()
        ? unitSlide(this.shadowRoot)
        : undefined;
    if (changedProps.has("_config")) {
      void this._energy.refresh();
    }
    this._read = this._reader();
    this._cardState = computeCardState({
      config: this._config,
      hass: this.hass,
      readings: this._readings(),
      templates: this._templates.templates(this._config),
      conditionContext: liveConditionContext,
      width: this._width.width,
      pageHidden: this._pageHidden,
    });
    this.toggleAttribute("dark", isDarkMode(this.hass));
    this._drawCar();
  }

  private _reader(): EntityReader {
    return isEnergy(this._config)
      ? energyReader(this.hass, this._energy.growthMap ?? {}, true)
      : wattsReader(this.hass);
  }

  private _readings(): Readings {
    return isEnergy(this._config)
      ? energyReadings(
          this.hass,
          { ...this._config, energy_date_selection: true },
          this._energy.growthMap
        )
      : powerReadings(this.hass, this._config);
  }

  /** Draws the car again only when its state, the theme's colours or the card's size change. */
  private _drawCar() {
    const car = this._config.car;
    this._carStatus = car
      ? carStatus(this.hass, car, this._read, isEnergy(this._config) ? "energy" : "power")
      : "hidden";
    const palette =
      this._carStatus !== "hidden" && this.shadowRoot
        ? readCarPalette(this.shadowRoot, this._carStatus === "idle")
        : undefined;
    this._carImage = palette
      ? (carImage(palette, carResolution(this._width.width), this._carImage ?? undefined) ?? null)
      : null;
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass) {
      return nothing;
    }
    if (isEnergy(this._config) && (!this._energy.window || cardState?.status !== "ready")) {
      return this._energyPlaceholder();
    }
    if (cardState?.status !== "ready") {
      return nothing;
    }
    const { labels, scene, leaders, boxFor, layout } = drawHouse(
      this._config,
      cardState,
      this.hass,
      carScene(this.hass, this._config.car, this._carStatus, this._carImage, this._read),
      this._read
    );
    const fit = fitLabels(this._width.width, boxFor);
    const { box, labelUnit } = fit;
    const scaleOfWires = wireScale(fit, this._config.wire_width);
    const context = {
      layout,
      actions: this._actions,
      clickable: this._config.clickable_entities,
      animateNumbers: this._animatesNumbers(),
      locale: this.hass.locale,
    };
    return html`
      <ha-card .header=${this._config.title}>
        <div
          class="stage ${this._config.title ? "titled" : ""}"
          style=${`--label-unit: ${labelUnit}px; --wire-scale: ${scaleOfWires}`}
        >
          <svg
            viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
            role="img"
            aria-label=${labels.map((label) => label.name).join(", ")}
          >
            ${gridFade(box)} ${scene(scaleOfWires)} ${leaders}
          </svg>
          ${labelsHtml(labels, box, context)}
        </div>
      </ha-card>
    `;
  }

  /** Home Assistant's own words while the period loads, or without a date picker to follow. */
  private _energyPlaceholder(): TemplateResult {
    const key = this._energy.window ? "loading" : "no_data";
    return html`<ha-card .header=${this._config.title}>
      <div class="card-content">${this.hass.localize(`ui.panel.lovelace.cards.energy.${key}`)}</div>
    </ha-card>`;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass || !this.shadowRoot) {
      return;
    }
    const cardState = this._cardState;
    if (cardState?.status === "ready" && cardState !== this._appliedCardState) {
      applyCardState(this, cardState);
      this._appliedCardState = cardState;
    }
    const morph = this._config.animate_numbers !== false && !prefersReducedMotion();
    this.shadowRoot
      .querySelectorAll<HTMLElement>(".direction, .unit")
      .forEach((word) => morphWord(word, word.dataset.word ?? "", morph));
    keepPulsePhase(this.shadowRoot, this._pulseDurations);
    this.shadowRoot.querySelectorAll("number-flow").forEach((flow) => {
      if (flow instanceof NumberFlow) {
        flow.update(Number(flow.dataset.value));
      }
    });
    this._unitSlide?.slide();
  }

  private _animatesNumbers() {
    return this._config.animate_numbers !== false && canAnimate;
  }

  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    "home-flow-card": HomeFlowCard;
  }
}
