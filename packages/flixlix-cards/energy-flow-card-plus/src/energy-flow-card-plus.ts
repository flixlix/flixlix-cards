import { computeCardState, type CardState, energyReadings } from "@flixlix-cards/shared/card-state";
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
import {
  fetchEnergyPeriodGrowth,
  getGlobalEnergyPeriodWindow,
  subscribeEnergyCollectionData,
  watchGlobalEnergyPeriodChanges,
  type EnergyCollectionFossilData,
  type EnergyPeriodWindow,
} from "@flixlix-cards/shared/states/utils/energy-period";
import { getEntityNames } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
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
  type: "energy-flow-card-plus",
  name: "Energy Flow Card Plus",
  description:
    "An extended version of the energy flow card with richer options, advanced features and a few small UI enhancements. Inspired by the Energy Dashboard.",
  version: packageJson.version,
});

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

@customElement("energy-flow-card-plus")
export class EnergyFlowCardPlus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: EnergyFlowCardPlusConfig;
  @state() private _width = 0;
  @state() private _energyWindow: EnergyPeriodWindow | null = null;
  @state() private _energyGrowthMap: Record<string, number> = {};
  @state() private _energyDataLoaded = false;
  @state() private _fossilEnergyData: EnergyCollectionFossilData = {};
  private _unsubEnergyPeriodListener?: () => void;
  private _unsubFossilData?: () => void;
  private _energyRefreshInFlight?: Promise<void>;
  private _energyRefreshGeneration = 0;
  private _energyRefreshPending = false;
  private _energyCollectionKey?: string;
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

  setConfig(config: EnergyFlowCardPlusConfig): void {
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
      mega_threshold: coerceNumber(config.mega_threshold, defaultValues.megaThreshold),
      max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
      min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
      use_new_flow_rate_model: false,
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
    const previousCollectionKey = this._energyCollectionKey;
    this._energyCollectionKey = config.collection_key;
    if (previousCollectionKey !== this._energyCollectionKey) {
      this._unsubEnergyPeriodListener?.();
      this._unsubEnergyPeriodListener = undefined;
      this._unsubFossilData?.();
      this._unsubFossilData = undefined;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._handleVisibilityChange);
    }
    this._ensureEnergyPeriodListener();
    this._ensureFossilDataSubscription();
    void this._refreshEnergyData();
  }

  public disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    }
    this._unsubEnergyPeriodListener?.();
    this._unsubEnergyPeriodListener = undefined;
    this._unsubFossilData?.();
    this._unsubFossilData = undefined;
    super.disconnectedCallback();
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("energy-flow-card-plus-editor");
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return getDefaultConfig(hass, "energy");
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._ensureEnergyPeriodListener();
      this._ensureFossilDataSubscription();
    }
    if (changedProps.has("_config")) {
      void this._refreshEnergyData();
    }
    this._cardState = computeCardState(
      {
        config: this._config,
        hass: this.hass,
        readings: energyReadings(
          this.hass,
          this._config,
          this._energyDataLoaded ? this._energyGrowthMap : undefined,
          this._fossilEnergyData.fossilEnergyConsumption
        ),
        templates: this._templates.templates(this._config),
        width: this._width,
        pageHidden: isPageHidden(),
      },
      this._cardState
    );
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass) {
      return nothing;
    }
    if (!this._energyWindow || cardState?.status !== "ready") {
      return html`<ha-card .header=${this._config.title}>
        <div class="card-content">
          ${
            this._energyWindow
              ? this.hass.localize("ui.panel.lovelace.cards.energy.loading")
              : this.hass.localize("ui.panel.lovelace.cards.energy.no_data")
          }
        </div>
      </ha-card>`;
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
          id="energy-flow-card-plus"
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

  private _collectStatisticIds(): string[] {
    const ids = new Set<string>();
    const pushEntity = (entity?: string) => {
      if (!entity) {
        return;
      }
      getEntityNames(entity).forEach((id) => {
        if (id) {
          ids.add(id);
        }
      });
    };
    const { entities } = this._config;
    if (!entities) {
      return [];
    }
    if (typeof entities.grid?.entity === "string") {
      pushEntity(entities.grid.entity);
    } else {
      pushEntity(entities.grid?.entity?.consumption);
      pushEntity(entities.grid?.entity?.production);
    }
    if (typeof entities.battery?.entity === "string") {
      pushEntity(entities.battery.entity);
    } else {
      pushEntity(entities.battery?.entity?.consumption);
      pushEntity(entities.battery?.entity?.production);
    }
    pushEntity(entities.solar?.entity);
    pushEntity(entities.home?.entity);
    pushEntity(entities.fossil_fuel_percentage?.entity);
    entities.individual?.forEach((individual) => {
      pushEntity(individual.entity);
    });
    return [...ids];
  }

  private _scheduleRefreshEnergyData(): void {
    if (this._energyRefreshPending) {
      return;
    }
    this._energyRefreshPending = true;
    queueMicrotask(() => {
      this._energyRefreshPending = false;
      void this._refreshEnergyData();
    });
  }

  private async _refreshEnergyData(): Promise<void> {
    const generation = ++this._energyRefreshGeneration;

    if (this._energyRefreshInFlight) {
      try {
        await this._energyRefreshInFlight;
      } catch {
        /* swallow – we are about to retry */
      }
    }

    if (generation !== this._energyRefreshGeneration) {
      return;
    }

    this._energyRefreshInFlight = this._doRefreshEnergyData();
    try {
      await this._energyRefreshInFlight;
    } finally {
      this._energyRefreshInFlight = undefined;
    }
  }

  private async _doRefreshEnergyData(): Promise<void> {
    if (!this.hass || !this._config?.entities) {
      return;
    }
    const window = getGlobalEnergyPeriodWindow(this.hass, this._energyCollectionKey);
    this._energyWindow = window;
    const statisticIds = this._collectStatisticIds();
    const zeroGrowthMap = Object.fromEntries(statisticIds.map((id) => [id, 0]));

    if (!window) {
      this._energyGrowthMap = zeroGrowthMap;
      this._energyDataLoaded = true;
      return;
    }

    try {
      const growth = await fetchEnergyPeriodGrowth(this.hass, statisticIds, window);
      this._energyGrowthMap = { ...zeroGrowthMap, ...growth };
      this._energyDataLoaded = true;
    } catch {
      this._energyGrowthMap = zeroGrowthMap;
      this._energyDataLoaded = true;
    }
  }

  private _ensureEnergyPeriodListener() {
    if (this._unsubEnergyPeriodListener || !this.hass) {
      return;
    }
    const unsub = watchGlobalEnergyPeriodChanges(
      this.hass,
      () => {
        this._scheduleRefreshEnergyData();
      },
      this._energyCollectionKey
    );
    if (unsub) {
      this._unsubEnergyPeriodListener = unsub;
      void this._refreshEnergyData();
    }
  }

  private _ensureFossilDataSubscription(): void {
    if (this._unsubFossilData || !this.hass) {
      return;
    }
    const unsub = subscribeEnergyCollectionData(
      this.hass,
      (data) => {
        this._fossilEnergyData = data;
      },
      this._energyCollectionKey
    );
    if (unsub) {
      this._unsubFossilData = unsub;
    }
  }

  private _observeWidth() {
    const content = this.shadowRoot?.querySelector<HTMLElement>("#energy-flow-card-plus");
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
