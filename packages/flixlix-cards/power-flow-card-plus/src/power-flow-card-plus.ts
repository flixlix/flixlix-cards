import { computeCardState, type CardState, powerReadings } from "@flixlix-cards/shared/card-state";
import { batteryElement } from "@flixlix-cards/shared/components/battery";
import { flowElement } from "@flixlix-cards/shared/components/flows/index";
import { gridElement } from "@flixlix-cards/shared/components/grid";
import { homeElement } from "@flixlix-cards/shared/components/home";
import { individualLeftBottomElement } from "@flixlix-cards/shared/components/individual-left-bottom-element";
import { individualLeftTopElement } from "@flixlix-cards/shared/components/individual-left-top-element";
import { individualRightBottomElement } from "@flixlix-cards/shared/components/individual-right-bottom-element";
import { individualRightTopElement } from "@flixlix-cards/shared/components/individual-right-top-element";
import { dashboardLinkElement } from "@flixlix-cards/shared/components/misc/dashboard-link";
import { nonFossilElement } from "@flixlix-cards/shared/components/non-fossil";
import { solarElement } from "@flixlix-cards/shared/components/solar";
import { spacer } from "@flixlix-cards/shared/components/spacer";
import { styles } from "@flixlix-cards/shared/style";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
import { EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { defaultValues, getDefaultConfig } from "@flixlix-cards/shared/utils/get-default-config";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { SecondaryTemplates } from "@flixlix-cards/shared/utils/secondary-templates";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import packageJson from "../package.json" with { type: "json" };

registerCustomCard({
  type: "power-flow-card-plus",
  name: "Power Flow Card Plus",
  description:
    "An extended version of the power flow card with richer options, advanced features and a few small UI enhancements. Inspired by the Energy Dashboard.",
  version: packageJson.version,
});

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

@customElement("power-flow-card-plus")
export class PowerFlowCardPlus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: PowerFlowCardPlusConfig;
  @state() private _width = 0;
  private _cardState?: CardState;
  private _appliedCardState?: CardState;
  private _resizeObserver?: ResizeObserver;
  private readonly _actions = new EntityActions(this, () => ({
    hass: this.hass,
    clickableEntities: this._config.clickable_entities,
  }));
  private readonly _templates = new SecondaryTemplates(this, () => ({
    hass: this.hass,
    config: this._config,
  }));
  private _handleVisibilityChange = () => {
    if (!isPageHidden()) {
      this.requestUpdate();
    }
  };

  setConfig(config: PowerFlowCardPlusConfig): void {
    if (config.entities?.individual1 || config.entities?.individual2) {
      throw new Error(
        "You are using an outdated configuration. Please update your configuration to the latest version. The individual1 and individual2 properties are now just a single individual array property. The easiest way to do this is to remove the individual1 and individual2 properties and replace them in the UI Editor."
      );
    }
    if (
      !config.entities ||
      (!config.entities?.battery?.entity &&
        !config.entities?.grid?.entity &&
        !config.entities?.solar?.entity)
    ) {
      throw new Error("At least one entity for battery, grid or solar must be defined");
    }
    this._config = {
      ...config,
      min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
      max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
      base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
      kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
      kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
      max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
      min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
      display_zero_lines: {
        mode: config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode,
        transparency: coerceNumber(
          config.display_zero_lines?.transparency,
          defaultValues.displayZeroLines.transparency
        ),
        grey_color:
          config.display_zero_lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
      },
    };
  }

  public connectedCallback() {
    super.connectedCallback();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._handleVisibilityChange);
    }
  }

  public disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    }
    super.disconnectedCallback();
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("power-flow-card-plus-editor");
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return getDefaultConfig(hass, "power");
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    this._cardState = computeCardState(
      {
        config: this._config,
        hass: this.hass,
        readings: powerReadings(this.hass, this._config),
        templates: this._templates.templates(this._config),
        width: this._width,
        pageHidden: isPageHidden(),
      },
      this._cardState
    );
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass || cardState?.status !== "ready") {
      return nothing;
    }
    const config = this._config;
    const main = this._actions;
    const { grid, solar, battery, home, nonFossil } = cardState.nodes;
    const { leftTop, leftBottom, rightTop, rightBottom } = cardState.individualSlots;
    const { layout, animate } = cardState;

    return html`
      <ha-card
        .header=${config.title}
        class=${config.full_size ? "full-size" : ""}
        style=${config.style_ha_card ?? ""}
      >
        <div
          class="card-content ${config.full_size ? "full-size" : ""} ${
            config.no_labels ? "no-labels" : ""
          }"
          id="power-flow-card-plus"
          style=${config.style_card_content ?? ""}
        >
          ${
            layout.showTopRow
              ? html`<div class="row">
                  ${nonFossilElement(main, config, { nonFossil, flow: cardState.flows.nonFossil, animate })}
                  ${
                    solar.has
                      ? solarElement(main, config, solar)
                      : cardState.nodes.individuals.length > 0
                        ? spacer
                        : nothing
                  }
                  ${individualLeftTopElement(main, config, { slot: leftTop, animate })}
                  ${
                    layout.hasRightIndividual
                      ? individualRightTopElement(main, config, {
                          slot: rightTop,
                          animate,
                          hasBottomRow: layout.showBottomRow,
                        })
                      : nothing
                  }
                </div>`
              : nothing
          }
          <div class="row">
            ${grid.has ? gridElement(main, config, grid) : spacer} ${spacer}
            ${
              !config.entities.home?.hide
                ? homeElement(main, config, {
                    home,
                    ring: cardState.homeRing,
                    showLabel: layout.showHomeLabel,
                  })
                : spacer
            }
            ${layout.hasRightIndividual ? spacer : nothing}
          </div>
          ${
            layout.showBottomRow
              ? html`<div class="row">
                  ${spacer} ${battery.has ? batteryElement(main, config, battery) : spacer}
                  ${individualLeftBottomElement(main, config, { slot: leftBottom, animate })}
                  ${
                    layout.hasRightIndividual
                      ? individualRightBottomElement(main, config, { slot: rightBottom, animate })
                      : nothing
                  }
                </div>`
              : spacer
          }
          ${flowElement(config, cardState)}
        </div>
        ${dashboardLinkElement(config, this.hass)}
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    this._observeWidth();
    const cardState = this._cardState;
    if (cardState?.status === "ready" && cardState !== this._appliedCardState) {
      applyCardState(this, cardState);
      this._appliedCardState = cardState;
    }
  }

  private _observeWidth() {
    const content = this.shadowRoot?.querySelector<HTMLElement>("#power-flow-card-plus");
    if (!content) {
      return;
    }
    this._resizeObserver ??= new ResizeObserver(([entry]) => {
      if (entry) {
        this._width = Math.round(entry.contentRect.width);
      }
    });
    this._resizeObserver.observe(content);
    this._width = Math.round(content.getBoundingClientRect().width);
  }

  static styles = styles;
}
