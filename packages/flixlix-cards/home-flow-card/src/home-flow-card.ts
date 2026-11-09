import {
  computeCardState,
  type CardState,
  houseWires,
  type ReadyCardState,
  powerReadings,
  watchedEntities,
} from "@flixlix-cards/shared/card-state";
import { EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
import {
  assertRenderableFlowCardConfig,
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
import packageJson from "../package.json" with { type: "json" };
import { carImage, type CarImage, carResolution, readCarPalette } from "./car-image";
import { carEntities, type CarScene, carScene, type CarStatus, carStatus } from "./car-node";
import { Extent } from "./extent";
import { houseLabels } from "./labels";
import { fitLabels, wireScale } from "./label-size";
import { includeLabel, includeLabelOf, labelsHtml, leaderSvg } from "./render-labels";
import { includeCar, sceneSvg } from "./render-scene";
import { gridFade, keepPulsePhase } from "./render-wires";
import { HOUSE_SPAN, project } from "./scene";
import { styles } from "./styles";
import {
  DEFAULT_STATE_OF_CHARGE_SEVERITY,
  type FlowConfig,
  fromEntities,
  type HomeFlowCardConfig,
  toFlowConfig,
} from "./types";
import { unitSlide } from "./unit-slide";
import { morphWord } from "./word-morph";

registerCustomCard({
  type: "home-flow-card",
  name: "Home Flow Card",
  description:
    "Power flows drawn on an isometric house: solar on the roof, a battery on the wall and every wire running through the inverter.",
  version: packageJson.version,
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

/** The house's middle, which the viewBox leans towards so the scene reads as centred. */
const HOUSE_MIDDLE = (project(HOUSE_SPAN[0])[0] + project(HOUSE_SPAN[1])[0]) / 2;

/** Where the battery's charge bar changes colour, and where its label shows the charge. */
const batteryOptions = ({ entities }: FlowConfig) => ({
  severity: entities.battery?.state_of_charge_severity ?? DEFAULT_STATE_OF_CHARGE_SEVERITY,
  position: entities.battery?.state_of_charge_position,
});

/**
 * The scene, its leaders and labels, and the viewBox that holds them all for labels at a scale
 * against the scene.
 */
const drawHouse = (
  config: FlowConfig,
  cardState: ReadyCardState,
  language: string,
  car: CarScene
) => {
  const wires = houseWires(config, cardState, car.reading);
  const battery = batteryOptions(config);
  const labels = houseLabels(
    cardState,
    wires,
    config.generator,
    config.entities.grid?.power_outage?.label_alert,
    language,
    car.label,
    battery.position
  );
  const extent = new Extent();
  const reserveGenerator = Boolean(config.entities.grid?.power_outage?.entity_generator);
  const scene = sceneSvg({
    cardState,
    wires,
    extent,
    severity: battery.severity,
    reserveGenerator,
    car: car.image,
  });
  // the car keeps its room while it is away, so the house does not jump as it comes and goes
  if (car.reserve) {
    includeCar(extent);
  }
  const boxFor = (scale: number) => {
    const withLabels = extent.clone();
    labels.forEach((label) => includeLabelOf(withLabels, label, scale));
    // the grid's and the generator's labels take turns: keep room for both, so the card keeps
    // its size as the grid goes down and comes back
    if (config.entities.grid) {
      includeLabel(withLabels, "grid", 0, { scale });
    }
    if (reserveGenerator) {
      includeLabel(withLabels, "generator", 0, { scale });
    }
    if (car.reserve) {
      includeLabel(withLabels, "car", 1, { scale });
    }
    // centring the house costs width the larger labels of a narrow card need more
    return withLabels.viewBox(10, HOUSE_MIDDLE, Math.min(Math.max(2 - scale, 0), 1));
  };
  return { labels, scene, leaders: labels.map(leaderSvg), boxFor };
};

@customElement("home-flow-card")
export class HomeFlowCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  /** The config in the `entities` shape the shared pipeline reads, with defaults filled in. */
  @state() private _config!: FlowConfig;
  private readonly _width = new WidthController(this, ".stage > svg");
  @state() private _pageHidden = isPageHidden();
  private _cardState?: CardState;
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
      max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
      min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
      display_zero_lines: displayZeroLinesWithDefaults(config.display_zero_lines),
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

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("home-flow-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return fromEntities(getDefaultConfig(hass, "power"));
  }

  public getCardSize(): number {
    return 6;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return cardShouldUpdate(
      changedProps,
      this.hass,
      this._config ? [...watchedEntities(this._config), ...carEntities(this._config.car)] : []
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
    this._cardState = computeCardState({
      config: this._config,
      hass: this.hass,
      readings: powerReadings(this.hass, this._config),
      templates: this._templates.templates(this._config),
      width: this._width.width,
      pageHidden: this._pageHidden,
    });
    this.toggleAttribute("dark", isDarkMode(this.hass));
    this._drawCar();
  }

  /** Draws the car again only when its state, the theme's colours or the card's size change. */
  private _drawCar() {
    const car = this._config.car;
    this._carStatus = car ? carStatus(this.hass, car) : "hidden";
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
    if (!this._config || !this.hass || cardState?.status !== "ready") {
      return nothing;
    }
    const { labels, scene, leaders, boxFor } = drawHouse(
      this._config,
      cardState,
      this.hass.locale?.language ?? "en",
      carScene(this.hass, this._config.car, this._carStatus, this._carImage)
    );
    const fit = fitLabels(this._width.width, boxFor);
    const { box, labelUnit } = fit;
    const context = {
      actions: this._actions,
      clickable: this._config.clickable_entities ?? false,
      animateNumbers: this._animatesNumbers(),
      locale: this.hass.locale,
    };
    return html`
      <ha-card .header=${this._config.title}>
        <div
          class="stage ${this._config.title ? "titled" : ""}"
          style=${`--label-unit: ${labelUnit}px; --wire-scale: ${wireScale(fit, this._config.wire_width)}`}
        >
          <svg
            viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
            role="img"
            aria-label=${labels.map((label) => label.name).join(", ")}
          >
            ${gridFade(box)} ${scene} ${leaders}
          </svg>
          ${labelsHtml(labels, box, context)}
        </div>
      </ha-card>
    `;
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
