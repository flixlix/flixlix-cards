import localize from "@flixlix-cards/shared/i18n";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import type { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import packageJson from "../package.json" with { type: "json" };
import "./energy-period-selector-plus-inner";
import type { EnergyPeriodSelectorPlusConfig } from "./types";

const ENERGY_COLLECTION_KEY_PREFIX = "energy_";

const COMPARE_MODE_NONE = 0;
const COMPARE_MODE_PREVIOUS = 1;

type EnergyCollectionLike = {
  start?: Date;
  end?: Date;
  startCompare?: Date;
  setPeriod?: (newStart: Date, newEnd?: Date) => void;
  setCompare?: (compare: number) => void;
  refresh?: () => void;
  subscribe?: (callback: (data: unknown) => void) => () => void;
};

registerCustomCard({
  type: "energy-period-selector-plus",
  name: "Energy Period Selector Plus",
  description: "An enhanced energy period selector card for Home Assistant.",
  version: packageJson.version,
});

@customElement("energy-period-selector-plus")
export class EnergyPeriodSelectorPlus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyPeriodSelectorPlusConfig;

  @state() private _compare = false;

  private _unsubscribe?: () => void;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("energy-period-selector-plus-editor");
  }

  public static getStubConfig(): EnergyPeriodSelectorPlusConfig {
    return {
      type: "custom:energy-period-selector-plus",
      vertical_opening_direction: "auto",
      opening_direction: "auto",
    };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return {
      rows: 1,
      columns: 12,
    };
  }

  public setConfig(config: EnergyPeriodSelectorPlusConfig): void {
    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._subscribeToEnergyData();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeFromEnergyData();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config") || changedProps.has("_compare")) {
      return true;
    }
    return changedProps.size > 1 || !changedProps.has("hass");
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._subscribeToEnergyData();
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const verticalOpeningDirection =
      this._config.vertical_opening_direction === "auto"
        ? undefined
        : this._config.vertical_opening_direction;

    const openingDirection =
      this._config.opening_direction === "auto" ? undefined : this._config.opening_direction;

    const showCompareCheckbox = this._config.hide_overflow && !this._config.disable_compare;

    return html`
      <ha-card>
        <div class="card-content">
          <energy-period-selector-plus-inner
            .hass=${this.hass}
            .collectionKey=${this._config.collection_key}
            .verticalOpeningDirection=${verticalOpeningDirection}
            .openingDirection=${openingDirection}
            .allowCompare=${!this._config.disable_compare}
            .hideOverflow=${!!this._config.hide_overflow}
          ></energy-period-selector-plus-inner>
          ${showCompareCheckbox
            ? html`
                <div class="compare-row">
                  <ha-formfield .label=${localize("card.compare_tooltip")}>
                    <ha-checkbox
                      .checked=${this._compare}
                      title=${localize("card.compare_tooltip")}
                      @change=${this._toggleCompare}
                    ></ha-checkbox>
                  </ha-formfield>
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _resolveConnectionKey(): string {
    if (this._config?.collection_key) {
      return `_${this._config.collection_key}`;
    }
    if (this.hass?.panelUrl) {
      return `_${ENERGY_COLLECTION_KEY_PREFIX}${this.hass.panelUrl}`;
    }
    return "_energy";
  }

  private _getEnergyCollection(): EnergyCollectionLike | null {
    if (!this.hass?.connection) return null;
    const connection = this.hass.connection as unknown as Record<string, unknown>;
    const keysToCheck = [this._resolveConnectionKey(), "_energy"];
    for (const key of keysToCheck) {
      const candidate = connection[key] as EnergyCollectionLike | undefined;
      if (candidate) return candidate;
    }
    return null;
  }

  private _subscribeToEnergyData(): void {
    if (!this._config?.hide_overflow || this._config?.disable_compare) {
      this._unsubscribeFromEnergyData();
      return;
    }

    const collection = this._getEnergyCollection();
    if (!collection) return;

    if (this._unsubscribe) return;

    if (collection.subscribe) {
      this._unsubscribe = collection.subscribe((data: unknown) => {
        const energyData = data as { startCompare?: Date };
        this._compare = energyData.startCompare !== undefined;
      });
    }
  }

  private _unsubscribeFromEnergyData(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  private _toggleCompare(): void {
    this._compare = !this._compare;
    const collection = this._getEnergyCollection();
    if (!collection) return;
    collection.setCompare?.(this._compare ? COMPARE_MODE_PREVIOUS : COMPARE_MODE_NONE);
    collection.refresh?.();
  }

  static styles = css`
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .compare-row {
      display: flex;
      align-items: center;
      padding: 0 16px 8px;
    }
    .compare-row ha-formfield {
      --mdc-typography-body2-font-size: 14px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus": EnergyPeriodSelectorPlus;
  }
}
