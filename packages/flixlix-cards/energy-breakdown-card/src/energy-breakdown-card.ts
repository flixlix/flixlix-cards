import { handleAction } from "@flixlix-cards/shared/ha/panels/lovelace/common/handle-action";
import {
  fetchEnergyPeriodGrowth,
  getGlobalEnergyPeriodWindow,
  watchGlobalEnergyPeriodChanges,
  type EnergyPeriodWindow,
} from "@flixlix-cards/shared/states/utils/energy-period";
import { getEnergyEntityState } from "@flixlix-cards/shared/utils/get-energy-entity-state";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import {
  type ActionConfig,
  type HomeAssistant,
  type LovelaceCard,
  type LovelaceCardEditor,
} from "custom-card-helpers";
import { LitElement, css, html, nothing, svg, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import packageJson from "../package.json" with { type: "json" };
import {
  type EnergyBreakdownCardConfig,
  type EnergyBreakdownEntityConfig,
  type ResolvedSegment,
} from "./types";
import { describeDonutSegment, formatValue, resolveSegments } from "./utils";

registerCustomCard({
  type: "energy-breakdown-card",
  name: "Energy Breakdown Card",
  description: "A bar or donut chart showing how your energy use is broken down across sources.",
  version: packageJson.version,
});

const DONUT_SIZE = 220;
const DONUT_DEFAULT_THICKNESS = 22;
const SEGMENT_GAP_DEG = 1.5;

@customElement("energy-breakdown-card")
export class EnergyBreakdownCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyBreakdownCardConfig;
  @state() private _activeIndex: number | null = null;
  @state() private _tooltipPos: { x: number; y: number } | null = null;
  @state() private _isCoarsePointer = false;
  @state() private _energyWindow: EnergyPeriodWindow | null = null;
  @state() private _energyGrowthMap: Record<string, number> = {};
  @state() private _energyDataLoaded = false;

  @query(".chart-host") private _chartHost?: HTMLElement;

  private _outsideClickListener?: (event: PointerEvent) => void;
  private _unsubEnergyPeriodListener?: () => void;
  private _energyCollectionKey?: string;
  private _energyRefreshInFlight?: Promise<void>;
  private _energyRefreshGeneration = 0;
  private _energyRefreshPending = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("energy-breakdown-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): EnergyBreakdownCardConfig {
    const energyEntities = Object.keys(hass?.states ?? {})
      .filter((id) => {
        const stateObj = hass.states[id];
        return (
          stateObj?.attributes?.device_class === "energy" || /(_energy|energy_)/i.test(id || "")
        );
      })
      .slice(0, 3)
      .map((entity) => ({ entity }));
    return {
      type: "custom:energy-breakdown-card",
      chart_type: "bar",
      entities: energyEntities,
    };
  }

  public setConfig(config: EnergyBreakdownCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    if (!Array.isArray(config.entities)) {
      throw new Error("`entities` must be a list");
    }
    this._config = {
      chart_type: "bar",
      show_legend: true,
      show_tooltip: true,
      show_total: true,
      show_legend_value: true,
      show_legend_percentage: true,
      show_icons: true,
      sort: true,
      group_others: true,
      legend_position: "bottom",
      energy_date_selection: false,
      ...config,
    };
    const previousCollectionKey = this._energyCollectionKey;
    this._energyCollectionKey = config.collection_key;
    if (previousCollectionKey !== this._energyCollectionKey) {
      this._unsubEnergyPeriodListener?.();
      this._unsubEnergyPeriodListener = undefined;
    }
  }

  public getCardSize(): number {
    const legend = this._config?.show_legend !== false;
    return this._config?.chart_type === "bar" ? (legend ? 3 : 2) : legend ? 5 : 4;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this._isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    }
    this._ensureEnergyPeriodListener();
    void this._refreshEnergyData();
  }

  public disconnectedCallback(): void {
    this._removeOutsideListener();
    this._unsubEnergyPeriodListener?.();
    this._unsubEnergyPeriodListener = undefined;
    super.disconnectedCallback();
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate?.(changed);
    if (!this._config || !this.hass) return;
    if (changed.has("hass") || changed.has("_config")) {
      this._ensureEnergyPeriodListener();
    }
    if (changed.has("_config")) {
      void this._refreshEnergyData();
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has("_activeIndex")) {
      if (this._activeIndex !== null) {
        this._addOutsideListener();
      } else {
        this._removeOutsideListener();
      }
    }
  }

  private _isEnergyMode(): boolean {
    return this._config?.energy_date_selection === true;
  }

  private _ensureEnergyPeriodListener(): void {
    if (!this._isEnergyMode()) return;
    if (this._unsubEnergyPeriodListener || !this.hass) return;
    const unsub = watchGlobalEnergyPeriodChanges(
      this.hass,
      () => this._scheduleRefreshEnergyData(),
      this._energyCollectionKey
    );
    if (unsub) {
      this._unsubEnergyPeriodListener = unsub;
      void this._refreshEnergyData();
    }
  }

  private _scheduleRefreshEnergyData(): void {
    if (this._energyRefreshPending) return;
    this._energyRefreshPending = true;
    queueMicrotask(() => {
      this._energyRefreshPending = false;
      void this._refreshEnergyData();
    });
  }

  private async _refreshEnergyData(): Promise<void> {
    if (!this._isEnergyMode()) {
      // Not using the energy collection — make sure the loaded gate doesn't block render.
      this._energyDataLoaded = true;
      this._energyWindow = null;
      return;
    }
    const generation = ++this._energyRefreshGeneration;
    if (this._energyRefreshInFlight) {
      try {
        await this._energyRefreshInFlight;
      } catch {
        /* swallow — about to retry */
      }
    }
    if (generation !== this._energyRefreshGeneration) return;
    this._energyRefreshInFlight = this._doRefreshEnergyData();
    try {
      await this._energyRefreshInFlight;
    } finally {
      this._energyRefreshInFlight = undefined;
    }
  }

  private async _doRefreshEnergyData(): Promise<void> {
    if (!this.hass || !this._config) return;
    const window = getGlobalEnergyPeriodWindow(this.hass, this._energyCollectionKey);
    this._energyWindow = window;
    const statisticIds = (this._config.entities ?? [])
      .map((e) => e.entity)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
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

  private _addOutsideListener(): void {
    if (this._outsideClickListener) return;
    this._outsideClickListener = (event: PointerEvent) => {
      const path = event.composedPath();
      if (path.includes(this)) return;
      this._closeTooltip();
    };
    window.addEventListener("pointerdown", this._outsideClickListener, { passive: true });
  }

  private _removeOutsideListener(): void {
    if (!this._outsideClickListener) return;
    window.removeEventListener("pointerdown", this._outsideClickListener);
    this._outsideClickListener = undefined;
  }

  private _closeTooltip(): void {
    this._activeIndex = null;
    this._tooltipPos = null;
  }

  private _openTooltipFor(index: number, event: { clientX: number; clientY: number }): void {
    const host = this._chartHost;
    if (!host) {
      this._activeIndex = index;
      return;
    }
    const rect = host.getBoundingClientRect();
    this._tooltipPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this._activeIndex = index;
  }

  private _onSegmentPointerEnter(index: number, event: PointerEvent): void {
    if (this._isCoarsePointer || event.pointerType === "touch") return;
    this._openTooltipFor(index, event);
  }

  private _onSegmentPointerMove(index: number, event: PointerEvent): void {
    if (this._activeIndex !== index) return;
    if (event.pointerType === "touch") return;
    this._openTooltipFor(index, event);
  }

  private _onSegmentPointerLeave(event: PointerEvent): void {
    if (this._isCoarsePointer || event.pointerType === "touch") return;
    this._closeTooltip();
  }

  private _onSegmentClick(index: number, event: MouseEvent, segment: ResolvedSegment): void {
    event.stopPropagation();
    const showTooltip = this._config?.show_tooltip !== false;
    const wasActive = this._activeIndex === index;
    if (showTooltip) {
      if (wasActive) {
        this._closeTooltip();
      } else {
        this._openTooltipFor(index, event);
      }
    }
    if (wasActive || !showTooltip) {
      this._invokeAction(segment, "tap");
    }
  }

  private _invokeAction(segment: ResolvedSegment, action: "tap" | "hold" | "double_tap"): void {
    if (!segment.entity || !this.hass) return;
    const cfg = segment.config;
    const tap_action: ActionConfig | undefined = cfg?.tap_action ?? { action: "more-info" };
    handleAction(
      this,
      this.hass,
      {
        entity: segment.entity,
        tap_action,
        hold_action: cfg?.hold_action,
        double_tap_action: cfg?.double_tap_action,
      },
      action
    );
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    if (this._isEnergyMode() && !this._energyDataLoaded) {
      return html`<ha-card .header=${this._config.title}>
        <div class="card-content empty">
          ${this.hass.localize?.("ui.panel.lovelace.cards.energy.loading") ?? "Loading…"}
        </div>
      </ha-card>`;
    }
    const useEnergy = this._isEnergyMode();
    const resolveValue = useEnergy
      ? (entity: string) =>
          getEnergyEntityState(this.hass, this._energyGrowthMap, true, entity) ?? 0
      : undefined;
    const { segments, total } = resolveSegments(this.hass, this._config, resolveValue);
    const chartType = this._config.chart_type ?? "donut";
    const hasData = total > 0 && segments.length > 0;
    const showLegend = this._config.show_legend !== false;
    const legendPosition =
      chartType === "bar" ? "bottom" : (this._config.legend_position ?? "bottom");

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "energy-breakdown-card": true,
          [`legend-${legendPosition}`]: showLegend,
        })}
      >
        <div class="card-content">
          <div
            class=${classMap({
              layout: true,
              [`layout-${chartType}`]: true,
              [`legend-${legendPosition}`]: showLegend,
            })}
          >
            <div class="chart-host" @pointerdown=${this._onChartHostPointerDown}>
              ${hasData
                ? chartType === "donut"
                  ? this._renderDonut(segments, total)
                  : this._renderBar(segments, total)
                : this._renderEmpty()}
              ${this._renderTooltip(segments)}
            </div>
            ${showLegend && hasData ? this._renderLegend(segments) : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _onChartHostPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-segment-index]")) {
      this._closeTooltip();
    }
  }

  private _renderEmpty(): TemplateResult {
    return html`<div class="empty">
      ${this.hass.localize?.("ui.panel.lovelace.cards.energy.no_data") ?? "No data"}
    </div>`;
  }

  private _renderDonut(segments: ResolvedSegment[], total: number): TemplateResult {
    const cx = DONUT_SIZE / 2;
    const cy = DONUT_SIZE / 2;
    const thickness = this._config?.donut_thickness ?? DONUT_DEFAULT_THICKNESS;
    const baseRadius = (DONUT_SIZE - thickness) / 2;
    const innerRadius = baseRadius - thickness / 2;
    const outerRadius = baseRadius + thickness / 2;
    const cornerRadius = Math.max(
      0,
      Math.min(this._config?.section_radius ?? thickness / 2, thickness / 2)
    );

    const paths: TemplateResult[] = [];
    let cursor = 0;
    const showGaps = segments.length > 1;
    segments.forEach((segment, index) => {
      const sweep = (segment.value / total) * 360;
      if (sweep <= 0) return;
      const gap = showGaps ? Math.min(SEGMENT_GAP_DEG, sweep / 2) : 0;
      const start = cursor + gap / 2;
      const end = cursor + sweep - gap / 2;
      cursor += sweep;
      const d = describeDonutSegment({
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle: start,
        endAngle: end,
        cornerRadius,
      });
      if (!d) return;
      const isActive = this._activeIndex === index;
      paths.push(svg`
        <path
          class=${classMap({ segment: true, "segment-active": isActive })}
          d=${d}
          fill=${segment.color}
          stroke="none"
          data-segment-index=${index}
          tabindex="0"
          role="button"
          aria-label=${`${segment.name}: ${formatValue(this.hass, segment.value, segment.unit, segment.decimals)} (${segment.percent.toFixed(0)}%)`}
          @pointerenter=${(e: PointerEvent) => this._onSegmentPointerEnter(index, e)}
          @pointermove=${(e: PointerEvent) => this._onSegmentPointerMove(index, e)}
          @pointerleave=${(e: PointerEvent) => this._onSegmentPointerLeave(e)}
          @click=${(e: MouseEvent) => this._onSegmentClick(index, e, segment)}
          @keydown=${(e: KeyboardEvent) => this._onSegmentKeydown(index, e, segment)}
        />
      `);
    });

    const showTotal = this._config?.show_total !== false;
    const active = this._activeIndex !== null ? segments[this._activeIndex] : undefined;
    const centerUnit = active?.unit ?? segments[0]?.unit ?? "";
    const centerLabel = active
      ? formatValue(this.hass, active.value, active.unit, active.decimals)
      : showTotal
        ? formatValue(this.hass, total, centerUnit, this._config?.decimals)
        : "";

    return html`
      <div class="donut-wrapper">
        <svg
          class="donut"
          viewBox="0 0 ${DONUT_SIZE} ${DONUT_SIZE}"
          role="img"
          aria-label="Energy breakdown donut chart"
        >
          <circle
            class="track"
            cx=${cx}
            cy=${cy}
            r=${baseRadius}
            stroke-width=${thickness}
            fill="none"
          />
          ${paths}
        </svg>
        ${centerLabel
          ? html`<div class="center-label">
              <div class="center-value">${centerLabel}</div>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderBar(segments: ResolvedSegment[], total: number): TemplateResult {
    const thickness = this._config?.bar_thickness ?? 18;
    const radius = this._config?.section_radius ?? thickness / 2;
    const showTotal = this._config?.show_total !== false;
    const active = this._activeIndex !== null ? segments[this._activeIndex] : undefined;
    const headerLabel = active
      ? formatValue(this.hass, active.value, active.unit, active.decimals)
      : formatValue(this.hass, total, segments[0]?.unit ?? "", this._config?.decimals);

    return html`
      <div class="bar-wrapper">
        ${showTotal
          ? html`<div class="bar-header">
              <div class="bar-header-value">
                ${headerLabel}
                <small>Total</small>
              </div>
            </div>`
          : nothing}
        <div
          class="bar-track"
          style=${styleMap({
            height: `${thickness}px`,
            borderRadius: `${radius}px`,
          })}
          role="img"
          aria-label="Energy breakdown bar chart"
        >
          ${segments.map((segment, index) => {
            const width = total > 0 ? (segment.value / total) * 100 : 0;
            if (width <= 0) return nothing;
            const isActive = this._activeIndex === index;
            return html`<button
              class=${classMap({ "bar-segment": true, "segment-active": isActive })}
              type="button"
              style=${styleMap({
                width: `${width}%`,
                background: segment.color,
              })}
              data-segment-index=${index}
              aria-label=${`${segment.name}: ${formatValue(this.hass, segment.value, segment.unit, segment.decimals)} (${segment.percent.toFixed(0)}%)`}
              @pointerenter=${(e: PointerEvent) => this._onSegmentPointerEnter(index, e)}
              @pointermove=${(e: PointerEvent) => this._onSegmentPointerMove(index, e)}
              @pointerleave=${(e: PointerEvent) => this._onSegmentPointerLeave(e)}
              @click=${(e: MouseEvent) => this._onSegmentClick(index, e, segment)}
              @keydown=${(e: KeyboardEvent) => this._onSegmentKeydown(index, e, segment)}
            ></button>`;
          })}
        </div>
      </div>
    `;
  }

  private _onSegmentKeydown(index: number, event: KeyboardEvent, segment: ResolvedSegment): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      this._openTooltipFor(index, {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
    }
    this._invokeAction(segment, "tap");
  }

  private _renderLegend(segments: ResolvedSegment[]): TemplateResult {
    const showIcons = this._config?.show_icons !== false;
    const showValue = this._config?.show_legend_value !== false;
    const showPercent = this._config?.show_legend_percentage !== false;
    return html`
      <ul class="legend" role="list">
        ${segments.map((segment, index) => {
          const valueText = formatValue(this.hass, segment.value, segment.unit, segment.decimals);
          const percentText = `${segment.percent.toFixed(0)}%`;
          return html`
            <li
              class=${classMap({
                "legend-item": true,
                "legend-item-active": this._activeIndex === index,
              })}
              data-segment-index=${index}
              tabindex="0"
              role="button"
              aria-label=${`${segment.name}: ${valueText} (${percentText})`}
              @pointerenter=${(e: PointerEvent) => this._onSegmentPointerEnter(index, e)}
              @pointerleave=${(e: PointerEvent) => this._onSegmentPointerLeave(e)}
              @click=${(e: MouseEvent) => this._onSegmentClick(index, e, segment)}
              @keydown=${(e: KeyboardEvent) => this._onSegmentKeydown(index, e, segment)}
            >
              <span class="legend-swatch" style=${styleMap({ background: segment.color })}></span>
              ${showIcons && segment.icon
                ? html`<ha-icon class="legend-icon" .icon=${segment.icon}></ha-icon>`
                : nothing}
              <span class="legend-name">${segment.name}</span>
              ${showValue || showPercent
                ? html`<span class="legend-value">
                    ${showValue ? html`<span class="legend-amount">${valueText}</span>` : nothing}
                    ${showPercent
                      ? html`<span class="legend-percent">${percentText}</span>`
                      : nothing}
                  </span>`
                : nothing}
            </li>
          `;
        })}
      </ul>
    `;
  }

  private _renderTooltip(segments: ResolvedSegment[]): TemplateResult | typeof nothing {
    if (this._config?.show_tooltip === false) return nothing;
    if (this._activeIndex === null || !this._tooltipPos) return nothing;
    const segment = segments[this._activeIndex];
    if (!segment) return nothing;
    const host = this._chartHost;
    const hostWidth = host?.clientWidth ?? 0;
    const hostHeight = host?.clientHeight ?? 0;
    const TIP_WIDTH = 180;
    const TIP_OFFSET = 12;
    let left = this._tooltipPos.x + TIP_OFFSET;
    let top = this._tooltipPos.y + TIP_OFFSET;
    if (hostWidth && left + TIP_WIDTH > hostWidth) {
      left = Math.max(0, this._tooltipPos.x - TIP_WIDTH - TIP_OFFSET);
    }
    if (hostHeight && top + 80 > hostHeight) {
      top = Math.max(0, this._tooltipPos.y - 80 - TIP_OFFSET);
    }
    return html`
      <div
        class="tooltip"
        role="tooltip"
        style=${styleMap({
          left: `${left}px`,
          top: `${top}px`,
          maxWidth: `${TIP_WIDTH}px`,
          borderColor: segment.color,
        })}
      >
        <div class="tooltip-header">
          <span class="tooltip-swatch" style=${styleMap({ background: segment.color })}></span>
          <span class="tooltip-name">${segment.name}</span>
        </div>
        <div class="tooltip-value">
          ${formatValue(this.hass, segment.value, segment.unit, segment.decimals)}
        </div>
        <div class="tooltip-percent">${segment.percent.toFixed(1)}%</div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --ebc-track-color: var(--divider-color, rgba(0, 0, 0, 0.08));
      --ebc-track-strength: 0.35;
      --ebc-tooltip-bg: var(--card-background-color, #fff);
      --ebc-tooltip-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      --ebc-radius: var(--ha-card-border-radius, 18px);
      display: block;
    }

    ha-card.energy-breakdown-card {
      overflow: hidden;
    }

    .card-content {
      padding: 16px;
    }

    .layout {
      display: flex;
      gap: 20px;
      align-items: center;
      justify-content: center;
    }

    .layout-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .layout-donut.legend-bottom {
      flex-direction: column;
    }

    .layout-donut.legend-right {
      flex-direction: row;
      align-items: center;
    }

    .chart-host {
      position: relative;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      touch-action: manipulation;
    }

    .layout-donut .chart-host {
      max-width: 220px;
      aspect-ratio: 1;
    }

    .layout-donut.legend-right .chart-host {
      flex: 0 0 auto;
    }

    .donut-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .donut {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05));
    }

    .donut .track {
      stroke: var(--ebc-track-color);
      opacity: var(--ebc-track-strength);
    }

    .donut .segment {
      transition:
        stroke-width 160ms ease,
        opacity 160ms ease;
      cursor: var(--clickable-cursor, pointer);
      outline: none;
    }

    .donut .segment:focus-visible {
      filter: brightness(1.1);
    }

    .donut .segment-active {
      filter: brightness(1.08);
    }

    .center-label {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      text-align: center;
      padding: 0 12%;
    }

    .center-value {
      font-size: 1.6rem;
      font-weight: 600;
      line-height: 1.1;
      color: var(--primary-text-color, #212121);
    }

    .center-sub {
      margin-top: 4px;
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bar-wrapper {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bar-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bar-header-value {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .bar-header small {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
    }

    .bar-track {
      width: 100%;
      display: flex;
      overflow: hidden;
      background: var(--ebc-track-color);
      gap: 2px;
      padding: 0;
    }

    .bar-segment {
      border: none;
      padding: 0;
      cursor: var(--clickable-cursor, pointer);
      transition:
        filter 160ms ease,
        transform 160ms ease;
      outline: none;
      min-width: 0;
    }

    .bar-segment:focus-visible {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .bar-segment.segment-active {
      filter: brightness(1.1);
    }

    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }

    .legend-bottom .legend {
      width: 100%;
    }

    .legend-right .legend {
      min-width: 160px;
      max-width: 240px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 12px;
      cursor: var(--clickable-cursor, pointer);
      transition: background-color 160ms ease;
      outline: none;
    }

    .legend-item:hover,
    .legend-item:focus-visible,
    .legend-item-active {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .legend-swatch {
      flex: 0 0 auto;
      width: 10px;
      height: 10px;
      border-radius: 999px;
    }

    .legend-icon {
      flex: 0 0 auto;
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color, #727272);
    }

    .legend-name {
      flex: 1 1 auto;
      font-size: 0.92rem;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .legend-value {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      font-size: 0.92rem;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color, #212121);
    }

    .legend-amount {
      color: var(--primary-text-color, #212121);
    }

    .legend-percent {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      min-width: 36px;
      text-align: right;
    }

    .empty {
      width: 100%;
      padding: 24px 0;
      text-align: center;
      color: var(--secondary-text-color, #727272);
    }

    .tooltip {
      position: absolute;
      z-index: 5;
      background: var(--ebc-tooltip-bg);
      color: var(--primary-text-color, #212121);
      border-radius: 12px;
      box-shadow: var(--ebc-tooltip-shadow);
      border: 1px solid transparent;
      padding: 10px 12px;
      pointer-events: none;
      transform: translateZ(0);
      animation: ebc-tooltip-in 120ms ease-out;
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .tooltip-swatch {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .tooltip-name {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tooltip-value {
      font-size: 1.05rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .tooltip-percent {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }

    @keyframes ebc-tooltip-in {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 480px) {
      .layout-donut.legend-right {
        flex-direction: column;
      }
      .legend-right .legend {
        min-width: 0;
        max-width: 100%;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-breakdown-card": EnergyBreakdownCard;
  }
}

export type { EnergyBreakdownCardConfig, EnergyBreakdownEntityConfig };
