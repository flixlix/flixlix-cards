import { type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing, svg, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";

import packageJson from "../package.json" with { type: "json" };
import "./components/battery-node";
import "./components/gauge";
import "./components/home-node";
import "./components/number-flow";
import "./components/power-node";
import { type FlixlixPowerCardConfig } from "./types";
import { computePower } from "./utils/compute-flow";
import { intensityToGap, intensityToSpeed, powerToIntensity } from "./utils/flow-shape";
import { scalePower } from "./utils/format-power";
import { makeActionHandlers, type ActionHandlers } from "./utils/handle-action";
import { resolveColor } from "./utils/resolve-color";

/**
 * Maximum opacity of the static gray track rail behind each flow. Kept in
 * sync with the CSS `.flows-svg .track` rule (the CSS value only matters
 * for the very first paint before `_tick` writes inline styles).
 */
const TRACK_BASE_OPACITY = 0.28;

const DEFAULT_COLORS = {
  grid: "var(--energy-grid-consumption-color, #2196f3)",
  gridProduction: "var(--energy-grid-return-color, #4caf50)",
  solar: "var(--energy-solar-color, #ff9800)",
  battery: "var(--energy-battery-out-color, #4caf50)",
  batteryIn: "var(--energy-battery-in-color, #66bb6a)",
  home: "var(--secondary-text-color, #6c6c6c)",
  device: "var(--secondary-text-color, #9e9e9e)",
};

registerCustomCard({
  type: "power-pulse-card",
  name: "Power Pulse Card",
  description:
    "A modern power flow card with the home centered, sources on top, and configurable devices below. Smooth dashed-circle flows.",
  version: packageJson.version,
});

interface FlowDescriptor {
  id: string;
  fromAnchor: string;
  toAnchor: string;
  fromOffsetX: number;
  toOffsetX: number;
  power: number;
  color: string;
  /** 1 = dots flow from `from` to `to`; -1 = the other way. */
  direction: 1 | -1;
}

const HOME_FAN_SPACING = 10;
/** Matches the CSS `min-width: 72px` on `.cell`. */
const MIN_CELL_WIDTH = 72;
const DEFAULT_ROW_GAP = 28;

const GAUGE_LEVELS = [
  { level: 0, color: "var(--warning-color, #ff9800)" },
  { level: 50, color: "var(--info-color, #03a9f4)" },
  { level: 80, color: "var(--success-color, #43a047)" },
];

/**
 * Natural gap shrinks as count grows so 2-3 items don't drift to the card
 * edges on wide cards:
 *   gap(count) = NATURAL_GAP_BASE / (1 + (count - 1) * NATURAL_GAP_FALLOFF)
 */
const NATURAL_GAP_BASE = 56;
const NATURAL_GAP_FALLOFF = 0.45;

interface FlowAnim {
  power: number;
  color: string;
  direction: 1 | -1;
  fromAnchor: string;
  toAnchor: string;
  phase: number;
  currentGap: number;
  currentSpeed: number;
  currentOpacity: number;
  targetGap: number;
  targetSpeed: number;
  targetOpacity: number;
}

interface SourceData {
  id: string;
  kind: "grid" | "solar" | "battery";
  icon: string;
  accent: string;
  scaledValue: number;
  decimals: number;
  unit: string;
  power: number;
  flowDirection: 1 | -1;
  active: boolean;
  charging?: boolean;
  soc?: number | null;
  showSoc?: boolean;
  handlers: ActionHandlers;
}

interface DeviceData {
  id: string;
  icon: string;
  accent: string;
  scaledValue: number;
  decimals: number;
  unit: string;
  power: number;
  active: boolean;
  handlers: ActionHandlers;
}

@customElement("power-pulse-card")
export class FlixlixPowerCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: FlixlixPowerCardConfig;

  @query(".flows-svg") private _svgEl?: SVGSVGElement;

  @state() private _availableWidth?: number;

  private _flowAnims = new Map<string, FlowAnim>();
  private _flows: FlowDescriptor[] = [];
  private _resizeObserver?: ResizeObserver;
  private _rafHandle?: number;
  private _lastTime?: number;

  setConfig(config: FlixlixPowerCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    if (!config.entities) throw new Error("`entities` is required");
    const hasAnySource =
      !!config.entities.grid?.entity ||
      (config.entities.solars?.length ?? 0) > 0 ||
      (config.entities.batteries?.length ?? 0) > 0;
    if (!hasAnySource) {
      throw new Error("At least one of grid, solar, or batteries must be configured.");
    }
    this._config = {
      max_expected_power: 5000,
      min_expected_power: 5,
      kilo_threshold: 1000,
      base_decimals: 0,
      kilo_decimals: 1,
      number_transition_ms: 600,
      dot_size: 4,
      dot_length: 14,
      ...config,
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("power-pulse-card-editor") as LovelaceCardEditor;
  }

  public static getStubConfig(): object {
    return {
      type: "custom:power-pulse-card",
      entities: { home: {} },
    };
  }

  public getCardSize(): number {
    return 4;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._lastTime = undefined;
    this._rafHandle = requestAnimationFrame(this._tick);
  }

  disconnectedCallback(): void {
    if (this._rafHandle !== undefined) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = undefined;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    super.disconnectedCallback();
  }

  protected updated(): void {
    if (!this._config || !this.hass) return;
    this._syncFlowAnims();
    this._setupResizeObserver();
    this._updatePathGeometry();
  }

  private _setupResizeObserver(): void {
    if (this._resizeObserver) return;
    const root = this.shadowRoot?.querySelector(".card-content") as HTMLElement | null;
    if (!root) return;
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      if (width !== this._availableWidth) {
        this._availableWidth = width;
      }
      this._updatePathGeometry();
    });
    this._resizeObserver.observe(root);
    // Seed before the observer fires so the first render has a width.
    const rect = root.getBoundingClientRect();
    if (rect.width > 0 && this._availableWidth === undefined) {
      this._availableWidth = Math.round(rect.width);
    }
  }

  private _syncFlowAnims(): void {
    const minPower = this._config.min_expected_power ?? 5;
    const maxPower = this._config.max_expected_power ?? 5000;
    const seen = new Set<string>();
    for (const f of this._flows) {
      seen.add(f.id);
      const intensity = powerToIntensity(f.power, { min: minPower, max: maxPower });
      const targetGap = intensityToGap(intensity);
      const targetSpeed = intensityToSpeed(intensity);
      const targetOpacity = f.power < minPower ? 0 : 1;

      const existing = this._flowAnims.get(f.id);
      if (!existing) {
        // New flows snap to their target opacity. The flash on first
        // appearance is prevented in the SVG template — each path renders
        // with `opacity="0"` and a sentinel `stroke-dasharray` so it paints
        // invisibly until `_tick` writes real values one frame later.
        this._flowAnims.set(f.id, {
          power: f.power,
          color: f.color,
          direction: f.direction,
          fromAnchor: f.fromAnchor,
          toAnchor: f.toAnchor,
          phase: 0,
          currentGap: targetGap,
          currentSpeed: targetSpeed,
          currentOpacity: targetOpacity,
          targetGap,
          targetSpeed,
          targetOpacity,
        });
      } else {
        existing.power = f.power;
        existing.color = f.color;
        existing.direction = f.direction;
        existing.fromAnchor = f.fromAnchor;
        existing.toAnchor = f.toAnchor;
        existing.targetGap = targetGap;
        existing.targetSpeed = targetSpeed;
        existing.targetOpacity = targetOpacity;
      }
    }
    for (const id of [...this._flowAnims.keys()]) {
      if (!seen.has(id)) this._flowAnims.delete(id);
    }
  }

  private _updatePathGeometry(): void {
    const svgEl = this._svgEl;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    svgEl.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

    // For non-zero offsetX, lift/lower the y so the point sits on the actual
    // circle (`cy ∓ √(r² − dx²)`). Lines connecting to fanned-out attachment
    // points then touch the bubble outline rather than floating above/below.
    const circleEdge = (
      selector: string,
      edge: "top" | "bottom",
      offsetX: number
    ): { x: number; y: number } | null => {
      const el = this.shadowRoot?.querySelector(selector);
      if (!el) return null;
      const bbox = el.getBoundingClientRect();
      const cx = bbox.left + bbox.width / 2 - rect.left;
      const cy = bbox.top + bbox.height / 2 - rect.top;
      const radius = Math.min(bbox.width, bbox.height) / 2;
      const clamped = Math.max(-radius, Math.min(radius, offsetX));
      const dy = Math.sqrt(Math.max(0, radius * radius - clamped * clamped));
      return {
        x: cx + clamped,
        y: edge === "top" ? cy - dy : cy + dy,
      };
    };

    for (const f of this._flows) {
      const path = svgEl.querySelector(`#${cssId(f.id)}`) as SVGPathElement | null;
      const track = svgEl.querySelector(`#${cssId(`track-${f.id}`)}`) as SVGPathElement | null;
      if (!path && !track) continue;
      const from = circleEdge(f.fromAnchor, "bottom", f.fromOffsetX);
      const to = circleEdge(f.toAnchor, "top", f.toOffsetX);
      if (!from || !to) continue;
      const midY = (from.y + to.y) / 2;
      // Cubic bezier with both control points at midY → tangents are
      // vertical at start and end, so the line goes straight down from the
      // source and re-straightens as it enters the destination.
      const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
      path?.setAttribute("d", d);
      track?.setAttribute("d", d);
    }
  }

  private _tick = (time: number): void => {
    if (this._lastTime === undefined) this._lastTime = time;
    const dt = Math.min(64, time - this._lastTime);
    this._lastTime = time;

    const dotSize = this._config?.dot_size ?? 4;
    const dotLength = Math.max(dotSize, this._config?.dot_length ?? 14);
    // Round caps add a half stroke-width past each end, so the visible pill
    // length is roughly `dotLength` only after subtracting `dotSize`.
    const dashLen = Math.max(0.001, dotLength - dotSize);
    const tau = 600;
    const fadeInTau = 1500;
    const fadeOutTau = 700;
    const alpha = 1 - Math.exp((-dt * Math.LN2) / tau);
    const fadeInAlpha = 1 - Math.exp((-dt * Math.LN2) / fadeInTau);
    const fadeOutAlpha = 1 - Math.exp((-dt * Math.LN2) / fadeOutTau);

    for (const [id, state] of this._flowAnims) {
      state.currentGap += (state.targetGap - state.currentGap) * alpha;
      state.currentSpeed += (state.targetSpeed - state.currentSpeed) * alpha;
      // Asymmetric: dropping to zero hides quickly so the card stops feeling
      // busy; coming back online is gentle so it doesn't pop in.
      const fadingIn = state.targetOpacity > state.currentOpacity;
      const opAlpha = fadingIn ? fadeInAlpha : fadeOutAlpha;
      state.currentOpacity += (state.targetOpacity - state.currentOpacity) * opAlpha;

      const cycleLen = Math.max(1, dotLength + state.currentGap);
      state.phase += (state.currentSpeed / 1000) * dt * state.direction;
      state.phase = ((state.phase % cycleLen) + cycleLen) % cycleLen;

      const path = this.shadowRoot?.querySelector(`#${cssId(id)}`) as SVGPathElement | null;
      if (path) {
        path.setAttribute(
          "stroke-dasharray",
          `${dashLen.toFixed(2)} ${(state.currentGap + dotSize).toFixed(2)}`
        );
        path.setAttribute("stroke-dashoffset", (-state.phase).toFixed(2));
        path.style.opacity = state.currentOpacity.toFixed(3);
      }
      const track = this.shadowRoot?.querySelector(
        `#${cssId(`track-${id}`)}`
      ) as SVGPathElement | null;
      if (track) {
        track.style.opacity = (state.currentOpacity * TRACK_BASE_OPACITY).toFixed(3);
      }
    }

    this._rafHandle = requestAnimationFrame(this._tick);
  };

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const cfg = this._config;
    const computed = computePower(this.hass, cfg);
    const locale = this.hass.locale?.language;
    const formatOpts = {
      kiloThreshold: cfg.kilo_threshold ?? 1000,
      baseDecimals: cfg.base_decimals ?? 0,
      kiloDecimals: cfg.kilo_decimals ?? 1,
    };
    const transitionMs = cfg.number_transition_ms ?? 600;
    const dotSize = cfg.dot_size ?? 10;

    const allSources = this._buildSources(computed, formatOpts);
    const allDevices = this._buildDevices(computed, formatOpts);
    const { visible: sources, gap: sourceGap } = this._layoutRow(allSources);
    const { visible: devices, gap: deviceGap } = this._layoutRow(
      allDevices,
      cfg.max_devices && cfg.max_devices > 0 ? cfg.max_devices : undefined
    );

    // Flow calculations always use the sources-derived total; the displayed
    // value can mirror the configured home entity instead.
    const homeDisplayWatts =
      cfg.entities.home?.override_state && cfg.entities.home?.entity
        ? getEntityStateWatts(this.hass, cfg.entities.home.entity)
        : computed.home.totalConsumption;
    const homeScaled = scalePower(homeDisplayWatts, formatOpts);

    const gauges = this._buildGauges(computed);

    const homeAnchor = ".home-anchor";
    const homeFan = (count: number, index: number) => (index - (count - 1) / 2) * HOME_FAN_SPACING;

    this._flows = [
      ...sources.map(
        (s, i): FlowDescriptor => ({
          id: `flow-src-${i}`,
          fromAnchor: `[data-src-anchor="${i}"]`,
          toAnchor: homeAnchor,
          fromOffsetX: 0,
          toOffsetX: homeFan(sources.length, i),
          power: s.power,
          color: s.accent,
          direction: s.flowDirection,
        })
      ),
      ...devices.map(
        (d, i): FlowDescriptor => ({
          id: `flow-dev-${i}`,
          fromAnchor: homeAnchor,
          toAnchor: `[data-dev-anchor="${i}"]`,
          fromOffsetX: homeFan(devices.length, i),
          toOffsetX: 0,
          power: d.power,
          color: d.accent,
          direction: 1,
        })
      ),
    ];

    return html`
      <ha-card .header=${cfg.title ?? ""}>
        <div class="card-content">
          <svg class="flows-svg" aria-hidden="true">
            <g class="track-layer">
              ${this._flows.map(
                (f) =>
                  svg`<path
                    id=${cssId(`track-${f.id}`)}
                    d=""
                    fill="none"
                    class="track"
                    stroke-width=${Math.max(1, dotSize - 1)}
                    stroke-linecap="round"
                    opacity="0"
                  ></path>`
              )}
            </g>
            <g class="flow-layer">
              ${this._flows.map(
                (f) =>
                  svg`<path
                    id=${cssId(f.id)}
                    d=""
                    fill="none"
                    stroke=${f.color}
                    stroke-width=${dotSize}
                    stroke-linecap="round"
                    stroke-dasharray="0.001 9999"
                    opacity="0"
                  ></path>`
              )}
            </g>
          </svg>

          ${sources.length
            ? html`<div
                class="row sources"
                data-count=${sources.length}
                style=${`gap: ${sourceGap}px;`}
              >
                ${sources.map((s, i) => this._renderSource(s, i, locale, transitionMs))}
              </div>`
            : nothing}

          <div class="row home-row">
            <div class="gauge-slot left">
              ${gauges.selfConsumption
                ? html`<flixlix-gauge
                    .value=${gauges.selfConsumption.value}
                    .label=${"Self-consumption"}
                    .levels=${GAUGE_LEVELS}
                    .locale=${locale}
                    .transitionMs=${transitionMs}
                  ></flixlix-gauge>`
                : nothing}
            </div>
            <div class="cell home-cell">
              <div class="home-anchor">${this._renderHome(homeScaled, locale, transitionMs)}</div>
            </div>
            <div class="gauge-slot right">
              ${gauges.autarky
                ? html`<flixlix-gauge
                    .value=${gauges.autarky.value}
                    .label=${"Autarky"}
                    .levels=${GAUGE_LEVELS}
                    .locale=${locale}
                    .transitionMs=${transitionMs}
                  ></flixlix-gauge>`
                : nothing}
            </div>
          </div>

          ${devices.length
            ? html`<div
                class="row devices"
                data-count=${devices.length}
                style=${`gap: ${deviceGap}px;`}
              >
                ${devices.map((d, i) => this._renderDevice(d, i, locale, transitionMs))}
              </div>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _renderSource(
    s: SourceData,
    idx: number,
    locale: string | undefined,
    transitionMs: number
  ): TemplateResult {
    return html`
      <div class="cell">
        <div class="value value-above">
          <flixlix-number-flow
            .value=${s.scaledValue}
            .decimals=${s.decimals}
            .unit=${s.unit}
            .locale=${locale}
            .duration=${transitionMs}
          ></flixlix-number-flow>
        </div>
        <div class="bubble-wrap" data-src-anchor=${idx}>
          ${s.kind === "battery"
            ? html`<flixlix-battery-node
                .icon=${s.icon}
                .accent=${s.accent}
                .stateOfCharge=${s.soc ?? null}
                .showSoc=${s.showSoc ?? true}
                .locale=${locale}
                .transitionMs=${transitionMs}
                ?active=${s.active}
                ?charging=${s.charging ?? false}
                @click=${s.handlers.onClick}
                @dblclick=${s.handlers.onDoubleClick}
                @pointerdown=${s.handlers.onPointerDown}
                @pointerup=${s.handlers.onPointerUp}
              ></flixlix-battery-node>`
            : html`<flixlix-power-node
                .icon=${s.icon}
                .accent=${s.accent}
                ?active=${s.active}
                @click=${s.handlers.onClick}
                @dblclick=${s.handlers.onDoubleClick}
                @pointerdown=${s.handlers.onPointerDown}
                @pointerup=${s.handlers.onPointerUp}
              ></flixlix-power-node>`}
        </div>
      </div>
    `;
  }

  private _renderDevice(
    d: DeviceData,
    idx: number,
    locale: string | undefined,
    transitionMs: number
  ): TemplateResult {
    return html`
      <div class="cell">
        <div class="bubble-wrap" data-dev-anchor=${idx}>
          <flixlix-power-node
            .icon=${d.icon}
            .accent=${d.accent}
            ?active=${d.active}
            @click=${d.handlers.onClick}
            @dblclick=${d.handlers.onDoubleClick}
            @pointerdown=${d.handlers.onPointerDown}
            @pointerup=${d.handlers.onPointerUp}
          ></flixlix-power-node>
        </div>
        <div class="value value-below">
          <flixlix-number-flow
            .value=${d.scaledValue}
            .decimals=${d.decimals}
            .unit=${d.unit}
            .locale=${locale}
            .duration=${transitionMs}
          ></flixlix-number-flow>
        </div>
      </div>
    `;
  }

  private _buildSources(
    computed: ReturnType<typeof computePower>,
    formatOpts: { kiloThreshold: number; baseDecimals: number; kiloDecimals: number }
  ): SourceData[] {
    const sources: SourceData[] = [];
    const cfg = this._config;

    if (cfg.entities.grid?.entity) {
      const exporting = computed.grid.exporting > 0 && computed.grid.toHome === 0;
      const power = exporting ? computed.grid.exporting : computed.grid.toHome;
      const scaled = scalePower(power, formatOpts);
      const accent = exporting
        ? resolveColor(cfg.entities.grid.color?.production, DEFAULT_COLORS.gridProduction)
        : resolveColor(cfg.entities.grid.color?.consumption, DEFAULT_COLORS.grid);
      const entityId =
        typeof cfg.entities.grid.entity === "string"
          ? cfg.entities.grid.entity
          : (cfg.entities.grid.entity?.consumption ?? cfg.entities.grid.entity?.production);
      sources.push({
        id: "grid",
        kind: "grid",
        icon: cfg.entities.grid.icon ?? "mdi:transmission-tower",
        accent,
        scaledValue: scaled.value,
        decimals: scaled.decimals,
        unit: scaled.unit,
        power,
        flowDirection: exporting ? -1 : 1,
        active: power > (cfg.min_expected_power ?? 5),
        handlers: makeActionHandlers(this.hass, cfg.entities.grid, entityId),
      });
    }

    (cfg.entities.solars ?? []).forEach((sol, i) => {
      if (!sol.entity) return;
      const computedSol = computed.solars[i]!;
      const power = computedSol.total;
      const scaled = scalePower(power, formatOpts);
      sources.push({
        id: `solar-${i}`,
        kind: "solar",
        icon: sol.icon ?? "mdi:weather-sunny",
        accent: resolveColor(sol.color, DEFAULT_COLORS.solar),
        scaledValue: scaled.value,
        decimals: scaled.decimals,
        unit: scaled.unit,
        power: computedSol.toHome,
        flowDirection: 1,
        active: computedSol.producing,
        handlers: makeActionHandlers(this.hass, sol, sol.entity),
      });
    });

    (cfg.entities.batteries ?? []).forEach((bat, i) => {
      const computedBat = computed.batteries[i]!;
      const charging = computedBat.charging;
      const power = charging ? computedBat.toBattery : computedBat.total;
      const scaled = scalePower(power, formatOpts);
      const accent = charging
        ? resolveColor(bat.color?.in, DEFAULT_COLORS.batteryIn)
        : resolveColor(bat.color?.out, DEFAULT_COLORS.battery);
      // SoC value is always read so the colored ring reflects the charge
      // level. `show_state_of_charge: false` hides only the percentage text.
      const soc = bat.state_of_charge ? getEntityState(this.hass, bat.state_of_charge) : null;
      const entityId =
        typeof bat.entity === "string"
          ? bat.entity
          : (bat.entity?.consumption ?? bat.entity?.production);
      sources.push({
        id: `battery-${i}`,
        kind: "battery",
        icon: bat.icon ?? batteryIcon(soc),
        accent,
        scaledValue: scaled.value,
        decimals: scaled.decimals,
        unit: scaled.unit,
        power,
        flowDirection: charging ? -1 : 1,
        active: computedBat.producing || charging,
        charging,
        soc,
        showSoc: bat.show_state_of_charge !== false,
        handlers: makeActionHandlers(this.hass, bat, entityId),
      });
    });

    return sources;
  }

  private _buildDevices(
    computed: ReturnType<typeof computePower>,
    formatOpts: { kiloThreshold: number; baseDecimals: number; kiloDecimals: number }
  ): DeviceData[] {
    const cfg = this._config;
    const minPower = cfg.min_expected_power ?? 5;
    return (cfg.entities.devices ?? []).map((dev, i) => {
      const power = computed.devices[i]?.power ?? 0;
      const scaled = scalePower(power, formatOpts);
      return {
        id: `device-${i}`,
        icon: dev.icon ?? "mdi:flash-outline",
        accent: resolveColor(dev.color, DEFAULT_COLORS.device),
        scaledValue: scaled.value,
        decimals: scaled.decimals,
        unit: scaled.unit,
        power,
        active: power > minPower,
        handlers: makeActionHandlers(this.hass, dev, dev.entity),
      };
    });
  }

  private _buildGauges(computed: ReturnType<typeof computePower>): {
    selfConsumption?: { value: number };
    autarky?: { value: number };
  } {
    const cfg = this._config;
    const wantSelfConsumption = cfg.gauges?.self_consumption === true;
    const wantAutarky = cfg.gauges?.autarky === true;
    if (!wantSelfConsumption && !wantAutarky) return {};

    const totalSolar = computed.solars.reduce((acc, s) => acc + s.total, 0);
    const totalSolarToHome = computed.solars.reduce((acc, s) => acc + s.toHome, 0);
    const totalBatteryToHome = computed.batteries.reduce((acc, b) => acc + b.toHome, 0);
    const homeTotal = computed.home.totalConsumption;

    const result: { selfConsumption?: { value: number }; autarky?: { value: number } } = {};
    if (wantSelfConsumption) {
      const value = totalSolar > 0 ? (totalSolarToHome / totalSolar) * 100 : 0;
      result.selfConsumption = { value };
    }
    if (wantAutarky) {
      const value = homeTotal > 0 ? ((totalSolarToHome + totalBatteryToHome) / homeTotal) * 100 : 0;
      result.autarky = { value };
    }
    return result;
  }

  /**
   * `maxCount` caps how many items render regardless of width. Items are
   * dropped lowest-power first; the visible row preserves original order.
   */
  private _layoutRow<T extends { power: number }>(
    items: T[],
    maxCount?: number
  ): { visible: T[]; gap: number } {
    const w = this._availableWidth;

    if (items.length === 0) {
      return { visible: items, gap: this._computeRowGap(items.length) };
    }

    let n =
      maxCount !== undefined
        ? Math.max(1, Math.min(items.length, Math.floor(maxCount)))
        : items.length;

    if (w !== undefined && w > 0) {
      while (n > 1 && n * MIN_CELL_WIDTH > w) n--;
    }

    let visible = items;
    if (n < items.length) {
      const sortedAsc = items.map((it, i) => ({ i, p: it.power })).sort((a, b) => a.p - b.p);
      const removed = new Set(sortedAsc.slice(0, items.length - n).map((x) => x.i));
      visible = items.filter((_, i) => !removed.has(i));
    }

    return { visible, gap: this._computeRowGap(visible.length) };
  }

  private _computeRowGap(count: number): number {
    if (count <= 1) return 0;
    const w = this._availableWidth;
    if (w === undefined || w <= 0) return DEFAULT_ROW_GAP;
    const naturalGap = NATURAL_GAP_BASE / (1 + (count - 1) * NATURAL_GAP_FALLOFF);
    const cellsTotal = count * MIN_CELL_WIDTH;
    if (cellsTotal >= w) return 0;
    const fitsAtNatural = cellsTotal + (count - 1) * naturalGap <= w;
    if (fitsAtNatural) return naturalGap;
    return Math.max(0, (w - cellsTotal) / (count - 1));
  }

  private _renderHome(
    homeScaled: { value: number; decimals: number; unit: string },
    locale: string | undefined,
    transitionMs: number
  ): TemplateResult {
    const cfg = this._config;
    const handlers = makeActionHandlers(this.hass, cfg.entities.home, cfg.entities.home?.entity);
    return html`<flixlix-home-node
      .icon=${cfg.entities.home?.icon ?? "mdi:home-variant-outline"}
      .accent=${resolveColor(cfg.entities.home?.color, DEFAULT_COLORS.home)}
      .value=${homeScaled.value}
      .decimals=${homeScaled.decimals}
      .unit=${homeScaled.unit}
      .locale=${locale}
      .transitionMs=${transitionMs}
      @click=${handlers.onClick}
      @dblclick=${handlers.onDoubleClick}
      @pointerdown=${handlers.onPointerDown}
      @pointerup=${handlers.onPointerUp}
    ></flixlix-home-node>`;
  }

  static styles = css`
    :host {
      --clickable-cursor: pointer;
      display: block;
    }

    .card-content {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 62px;
      padding: 16px 20px;
    }

    .flows-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    /* Opacity here is a first-paint fallback; _tick writes the real
       opacity inline (kept in sync via TRACK_BASE_OPACITY). */
    .flows-svg .track {
      stroke: var(--divider-color, rgba(127, 127, 127, 1));
      opacity: 0.28;
    }

    /* Flex (not grid) so cells take their natural width and the row stays
       compact on wide cards — grid 1fr columns spread 2 bubbles to the far
       left and right. */
    .row {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      flex-wrap: nowrap;
    }

    /* 3-column grid keeps the home cell at the visual center regardless of
       which gauge slots are populated. */
    .home-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
    }

    .gauge-slot {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 72px;
    }

    .bubble-wrap {
      display: inline-flex;
    }

    .value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color);
      line-height: 1.1;
    }

    @media (max-width: 360px) {
      .row {
        gap: 16px;
      }
      .row[data-count="4"] {
        gap: 12px;
      }
      .row[data-count="5"],
      .row[data-count="6"] {
        gap: 8px;
      }

      .cell {
        min-width: 64px;
      }

      .card-content {
        padding: 12px 12px;
        gap: 24px;
      }
    }
  `;
}

function batteryIcon(soc: number | null): string {
  if (soc === null) return "mdi:battery";
  if (soc >= 90) return "mdi:battery";
  if (soc >= 70) return "mdi:battery-high";
  if (soc >= 40) return "mdi:battery-medium";
  if (soc >= 15) return "mdi:battery-low";
  return "mdi:battery-outline";
}

function cssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

declare global {
  interface HTMLElementTagNameMap {
    "power-pulse-card": FlixlixPowerCard;
  }
}
