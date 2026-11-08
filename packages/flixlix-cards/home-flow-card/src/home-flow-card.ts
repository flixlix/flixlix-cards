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
import { Extent } from "./extent";
import { houseLabels } from "./labels";
import { includeLabel, labelsHtml, leaderSvg } from "./render-labels";
import { sceneSvg } from "./render-scene";
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

/** The scene, its leaders and labels, and the viewBox that holds them all. */
const drawHouse = (config: FlowConfig, cardState: ReadyCardState, language: string) => {
  const wires = houseWires(config, cardState);
  const labels = houseLabels(
    cardState,
    wires,
    config.generator,
    config.entities.grid?.power_outage?.label_alert,
    language
  );
  const extent = new Extent();
  const reserveGenerator = Boolean(config.entities.grid?.power_outage?.entity_generator);
  const scene = sceneSvg({
    cardState,
    wires,
    extent,
    severity: config.entities.battery?.state_of_charge_severity ?? DEFAULT_STATE_OF_CHARGE_SEVERITY,
    reserveGenerator,
  });
  const leaders = labels.map((label) => leaderSvg(label, extent));
  // the grid's and the generator's labels take turns: keep room for both, so the card keeps its
  // size as the grid goes down and comes back
  if (config.entities.grid) {
    includeLabel(extent, "grid", 0);
  }
  if (reserveGenerator) {
    includeLabel(extent, "generator", 0);
  }
  return { labels, scene, leaders, box: extent.viewBox(10, HOUSE_MIDDLE) };
};

@customElement("home-flow-card")
export class HomeFlowCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  /** The config in the `entities` shape the shared pipeline reads, with defaults filled in. */
  @state() private _config!: FlowConfig;
  private readonly _width = new WidthController(this, ".stage > svg");
  @state() private _pageHidden = isPageHidden();
  private _cardState?: CardState;
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
      this._config ? watchedEntities(this._config) : []
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
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass || cardState?.status !== "ready") {
      return nothing;
    }
    const { labels, scene, leaders, box } = drawHouse(
      this._config,
      cardState,
      this.hass.locale?.language ?? "en"
    );
    const unit = this._width.width > 0 ? this._width.width / box.width : 1;
    const context = {
      actions: this._actions,
      clickable: this._config.clickable_entities ?? false,
      animateNumbers: this._animatesNumbers(),
      locale: this.hass.locale,
    };
    return html`
      <ha-card .header=${this._config.title}>
        <div class="stage ${this._config.title ? "titled" : ""}" style=${`--house-unit: ${unit}px`}>
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
    this.toggleAttribute("dark", isDarkMode(this.hass));
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
