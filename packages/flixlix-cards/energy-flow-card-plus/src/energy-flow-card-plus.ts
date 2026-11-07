import { computeCardState, type CardState, energyReadings } from "@flixlix-cards/shared/card-state";
import { flowCard } from "@flixlix-cards/shared/components/flow-card";
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
import {
  assertRenderableFlowCardConfig,
  displayZeroLinesWithDefaults,
} from "@flixlix-cards/shared/utils/flow-card-config";
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
      use_new_flow_rate_model: false,
      display_zero_lines: displayZeroLinesWithDefaults(config.display_zero_lines),
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
    return flowCard(this._actions, this._config, cardState, this.hass, "energy-flow-card-plus");
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
