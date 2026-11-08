import {
  computeCardState,
  type CardState,
  type HouseNode,
  type HouseWire,
  houseWires,
  powerReadings,
  type ReadyCardState,
  type ScaledReading,
  watchedEntities,
} from "@flixlix-cards/shared/card-state";
import { translate } from "@flixlix-cards/shared/i18n";
import { type ActionConfigSet } from "@flixlix-cards/shared/types";
import { applyCardState } from "@flixlix-cards/shared/utils/apply-card-state";
import { EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import {
  assertRenderableFlowCardConfig,
  displayZeroLinesWithDefaults,
} from "@flixlix-cards/shared/utils/flow-card-config";
import { formatNumber } from "@flixlix-cards/shared/utils/format-number";
import { defaultValues, getDefaultConfig } from "@flixlix-cards/shared/utils/get-default-config";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { cardShouldUpdate } from "@flixlix-cards/shared/utils/relevant-change";
import { SecondaryTemplates } from "@flixlix-cards/shared/utils/secondary-templates";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { mdiLeaf } from "@mdi/js";
import {
  type HomeAssistant,
  type LovelaceCardEditor,
  numberFormatToLocale,
} from "custom-card-helpers";
import { html, LitElement, nothing, type PropertyValues, svg, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import NumberFlow, { canAnimate } from "number-flow";
import packageJson from "../package.json" with { type: "json" };
import {
  faceTransform,
  LABEL_ANCHORS,
  panelSeams,
  type Point,
  project,
  sceneGroups,
  type ScreenPoint,
  SHADOW,
  type Shape,
  WIRE_ROUTES,
} from "./scene";
import { styles } from "./styles";
import { type PowerFlowHouseCardConfig } from "./types";

registerCustomCard({
  type: "power-flow-house-card",
  name: "Power Flow House Card",
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

const isPageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

/** Screen-space box the scene and its labels take, for the viewBox. */
class Extent {
  private _box: [left: number, top: number, right: number, bottom: number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];

  include([x, y]: ScreenPoint, margin = 0): void {
    const [left, top, right, bottom] = this._box;
    this._box = [
      Math.min(left, x - margin),
      Math.min(top, y - margin),
      Math.max(right, x + margin),
      Math.max(bottom, y + margin),
    ];
  }

  viewBox(padding: number): { x: number; y: number; width: number; height: number } {
    const [left, top, right, bottom] = this._box;
    return {
      x: left - padding,
      y: top - padding,
      width: right - left + padding * 2,
      height: bottom - top + padding * 2,
    };
  }
}

// reduceRight: toReversed needs Chrome 110 and reverse mutates.
const reversed = (points: readonly Point[]): Point[] =>
  points.reduceRight<Point[]>((list, point) => list.concat([point]), []);

/** A wire's path in the direction its power flows. */
const route = (wire: HouseWire) => {
  const fromNode = WIRE_ROUTES[wire.node];
  const points = wire.intoInverter ? fromNode : reversed(fromNode);
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${project(point).join(" ")}`)
    .join("");
};

/** Pulses travel this many times slower than the flow rate's seconds per dot. */
const PULSE_SLOWDOWN = 2.5;

/** Fills that are gradients defined in the scene's <defs>; every other fill is a colour token. */
const GRADIENT_FILLS = new Set(["wall", "gable", "panel", "box-front"]);
const fillOf = (name: string) =>
  GRADIENT_FILLS.has(name) ? `url(#house-${name})` : `var(--house-${name})`;

const gradient = (name: string) =>
  svg`<linearGradient id="house-${name}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style=${`stop-color: var(--house-${name}-top)`}></stop>
    <stop offset="1" style=${`stop-color: var(--house-${name})`}></stop>
  </linearGradient>`;

/** Rough size of a label in screen units, so the viewBox leaves room for it. */
const LABEL_WIDTH = 92;
const LABEL_HEIGHT = 34;
const EXTRA_LINE_HEIGHT = 13;

/** What a label shows: `reading` null shows a dash, as during a power outage. */
type Label = {
  node: HouseNode;
  reading: ScaledReading | null;
  name: string;
  /** Shown after the name, e.g. the state of charge. */
  inline?: TemplateResult;
  /** A second line under the name, e.g. the low-carbon share. */
  extra?: TemplateResult;
  nameClass?: string;
  actions: ActionConfigSet;
  entity: string | undefined;
};

@customElement("power-flow-house-card")
export class PowerFlowHouseCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: PowerFlowHouseCardConfig;
  @state() private _width = 0;
  @state() private _pageHidden = isPageHidden();
  private _cardState?: CardState;
  private _appliedCardState?: CardState;
  private _resizeObserver?: ResizeObserver;
  private _observedScene?: Element;
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

  setConfig(config: PowerFlowHouseCardConfig): void {
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
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._observedScene = undefined;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    }
    super.disconnectedCallback();
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("power-flow-house-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): object {
    return getDefaultConfig(hass, "power");
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
    this._cardState = computeCardState(
      {
        config: this._config,
        hass: this.hass,
        readings: powerReadings(this.hass, this._config),
        templates: this._templates.templates(this._config),
        width: this._width,
        pageHidden: this._pageHidden,
      },
      this._cardState
    );
  }

  protected render(): TemplateResult | typeof nothing {
    const cardState = this._cardState;
    if (!this._config || !this.hass || cardState?.status !== "ready") {
      return nothing;
    }
    const wires = houseWires(this._config, cardState);
    const extent = new Extent();
    const scene = this._scene(cardState, wires, extent);
    const labels = this._labels(cardState, wires);
    const leaders = labels.map((label) => this._leader(label, extent));
    const box = extent.viewBox(10);
    const unit = this._width > 0 ? this._width / box.width : 1;
    const at = ([x, y]: ScreenPoint) =>
      `left: ${((x - box.x) / box.width) * 100}%; top: ${((y - box.y) / box.height) * 100}%`;
    return html`
      <ha-card .header=${this._config.title}>
        <div class="stage" style=${`--house-unit: ${unit}px`}>
          <svg
            viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
            role="img"
            aria-label=${labels.map((label) => label.name).join(", ")}
          >
            ${scene} ${leaders}
          </svg>
          <div class="labels">
            ${labels.map((label) => {
              const anchor = LABEL_ANCHORS[label.node];
              const [x, y] = project(anchor.at);
              return this._label(label, at([x, y + anchor.leader]), anchor.leader);
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    this._observeWidth();
    this.toggleAttribute("dark", isDarkMode(this.hass));
    const cardState = this._cardState;
    if (cardState?.status === "ready" && cardState !== this._appliedCardState) {
      applyCardState(this, cardState);
      this._appliedCardState = cardState;
    }
    this.shadowRoot?.querySelectorAll("number-flow").forEach((flow) => {
      if (flow instanceof NumberFlow) {
        flow.update(Number(flow.dataset.value));
      }
    });
  }

  private _scene(cardState: ReadyCardState, wires: HouseWire[], extent: Extent) {
    const screen = (point: Point) => {
      const projected = project(point);
      extent.include(projected);
      return projected;
    };
    const points = (list: readonly Point[]) =>
      list.map((point) => screen(point).join(",")).join(" ");
    const path = (list: readonly Point[]) =>
      list.map((point, index) => `${index === 0 ? "M" : "L"}${screen(point).join(" ")}`).join("");
    const { nodes } = cardState;
    const soc = nodes.battery.state_of_charge.state;
    const groups = sceneGroups({
      solar: nodes.solar.has,
      battery: nodes.battery.has,
      soc: typeof soc === "number" ? soc / 100 : null,
    });
    const shape = (item: Shape) =>
      item.kind === "face"
        ? svg`<polygon points=${points(item.points)} fill=${fillOf(item.fill)} stroke=${fillOf(item.fill)} stroke-width="0.4" stroke-linejoin="round"></polygon>`
        : svg`<g transform=${faceTransform(item.face, item.at)}><path d=${item.path} transform="scale(${item.size / 24}) translate(-12 -12)" fill="var(--house-icon)"></path></g>`;
    const seams = nodes.solar.has
      ? svg`<path d=${panelSeams()
          .map(([from, to]) => path([from, to]))
          .join("")} stroke="var(--house-panel-seam)" stroke-width="1"></path>`
      : nothing;
    const [groundX, groundY] = project([4, 6, 0]);
    return svg`
      <defs>
        ${["wall", "gable", "panel", "box-front"].map(gradient)}
        <radialGradient id="house-ground">
          <stop offset="0" style="stop-color: var(--house-ground)"></stop>
          <stop offset="0.7" style="stop-color: var(--house-ground); stop-opacity: 0.6"></stop>
          <stop offset="1" style="stop-color: var(--house-ground); stop-opacity: 0"></stop>
        </radialGradient>
        <filter id="house-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"></feGaussianBlur></filter>
      </defs>
      <ellipse cx=${groundX} cy=${groundY + 30} rx="260" ry="150" fill="url(#house-ground)"></ellipse>
      <polygon points=${points(SHADOW)} fill="var(--house-shadow)" filter="url(#house-blur)" opacity="0.55"></polygon>
      ${groups.map(
        (group) =>
          svg`<g class="node ${group.node}">${group.shapes.map(shape)}${group.node === "solar" ? seams : nothing}</g>`
      )}
      ${this._wires(wires, cardState.animate)}
    `;
  }

  /** Wires under-to-over in layers, so they meet cleanly at the inverter. */
  /**
   * Every wire as a neutral track; one carrying power also gets its colour and moving pulses.
   * Wires are not part of the extent: the grid cable runs on past the card's edge.
   */
  private _wires(wires: HouseWire[], animate: boolean) {
    const power = (wire: HouseWire) => {
      const d = route(wire);
      const duration = `animation-duration: ${wire.durationSeconds * PULSE_SLOWDOWN}s`;
      return svg`<g class="power ${wire.node}" style=${`--wire-color: ${wire.color}`}>
        <path class="flow" d=${d}></path>
        ${animate ? svg`<path class="pulse" d=${d} style=${duration}></path>` : nothing}
      </g>`;
    };
    return svg`
      ${wires.map((wire) => svg`<path class="track ${wire.node}" d=${route(wire)}></path>`)}
      ${wires.filter((wire) => wire.power > 0).map(power)}
    `;
  }

  /** One label per wire, in the order the labels are read: solar, home, battery, grid. */
  private _labels({ nodes }: ReadyCardState, wires: HouseWire[]): Label[] {
    const wireOf = (node: HouseNode) => wires.find((wire) => wire.node === node);
    const solar = wireOf("solar");
    const home = wireOf("home");
    const battery = wireOf("battery");
    const grid = wireOf("grid");
    return [
      solar && {
        node: "solar" as const,
        reading: solar.reading,
        name: nodes.solar.name,
        actions: nodes.solar,
        entity: nodes.solar.entity,
      },
      home && {
        node: "home" as const,
        reading: home.reading,
        name: nodes.home.name,
        actions: nodes.home,
        entity: nodes.home.entity,
      },
      battery && this._batteryLabel(nodes, battery),
      grid && this._gridLabel(nodes, grid),
    ].filter((label): label is Label => label !== undefined);
  }

  private _batteryLabel(nodes: ReadyCardState["nodes"], wire: HouseWire): Label {
    return {
      node: "battery",
      reading: wire.reading,
      name: nodes.battery.name,
      inline: this._stateOfCharge(
        wire,
        nodes.battery.state_of_charge.state,
        nodes.battery.display.stateOfCharge
      ),
      actions: nodes.battery,
      entity: nodes.battery.mainEntity,
    };
  }

  /** The grid's import or export, or a dash and the outage alert while the power is out. */
  private _gridLabel(nodes: ReadyCardState["nodes"], wire: HouseWire): Label {
    const base = { node: "grid" as const, name: nodes.grid.name, actions: nodes.grid };
    if (nodes.grid.powerOutage.isOutage) {
      const alert =
        this._config.entities.grid?.power_outage?.label_alert ??
        translate("editor.power_outage", this.hass.locale?.language ?? "en");
      return {
        ...base,
        reading: null,
        extra: html`<span class="outage">${alert}</span>`,
        nameClass: "outage",
        entity: nodes.grid.mainEntity,
      };
    }
    return {
      ...base,
      reading: wire.reading,
      extra: nodes.nonFossil.has
        ? html`<svg viewBox="0 0 24 24"><path d=${mdiLeaf}></path></svg>${nodes.nonFossil.display}
            ${nodes.nonFossil.name}`
        : undefined,
      entity: nodes.grid.mainEntity,
    };
  }

  private _stateOfCharge(battery: HouseWire, soc: number | string | null, display: string) {
    const charging = !battery.intoInverter && battery.power > 0;
    const discharging = battery.intoInverter && battery.power > 0;
    if (soc === null && !charging && !discharging) {
      return undefined;
    }
    return html`<span class="state-of-charge"
      >${charging ? html`<span class="charging">▲</span>` : nothing}${
        discharging ? html`<span class="discharging">▼</span>` : nothing
      }
      ${soc === null ? nothing : display}</span
    >`;
  }

  private _leader(label: Label, extent: Extent) {
    const anchor = LABEL_ANCHORS[label.node];
    const [x, y] = project(anchor.at);
    const end = y + anchor.leader;
    const height = LABEL_HEIGHT + (label.extra ? EXTRA_LINE_HEIGHT : 0);
    if (anchor.leader === 0) {
      extent.include([x - LABEL_WIDTH / 2, y - height / 2], 4);
      extent.include([x + LABEL_WIDTH / 2, y + height / 2], 4);
      return nothing;
    }
    extent.include([x, end + Math.sign(anchor.leader) * height], 4);
    extent.include([x - 10 + LABEL_WIDTH, end], 4);
    return svg`<path d="M${x} ${y}V${end}" stroke="var(--house-leader)" stroke-width="0.8"></path>
      <circle cx=${x} cy=${y} r="1.6" fill="var(--house-leader)"></circle>`;
  }

  /** A label above (`leader` < 0), below (> 0) or centred on its anchor (0). */
  private _label(label: Label, position: string, leader: number) {
    const placement = leader === 0 ? "on-line" : leader > 0 ? "down" : "up";
    const clickable = this._config.clickable_entities;
    const { actions, entity } = label;
    return html`<div
      class="label ${placement} ${clickable ? "clickable" : ""} ${label.node}"
      style=${position}
      role=${clickable ? "button" : nothing}
      tabindex=${clickable ? 0 : nothing}
      @click=${(event: MouseEvent) => this._actions.onEntityClick(event, actions, entity)}
      @dblclick=${(event: MouseEvent) => this._actions.onEntityDoubleClick(event, actions, entity)}
      @pointerdown=${(event: PointerEvent) =>
        this._actions.onEntityPointerDown(event, actions, entity)}
      @pointerup=${(event: PointerEvent) => this._actions.onEntityPointerUp(event)}
      @pointercancel=${(event: PointerEvent) => this._actions.onEntityPointerUp(event)}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key === "Enter" && event.target instanceof HTMLElement) {
          this._actions.openDetails(
            {
              key: event.key,
              stopPropagation: () => event.stopPropagation(),
              target: event.target,
            },
            actions,
            entity
          );
        }
      }}
    >
      <div class="value">${this._value(label.reading)}</div>
      <div class="name ${label.nameClass ?? ""}">${label.name}${label.inline ?? nothing}</div>
      ${label.extra ? html`<div class="name extra">${label.extra}</div>` : nothing}
    </div>`;
  }

  private _value(reading: ScaledReading | null) {
    if (reading === null) {
      return "—";
    }
    const unit = html`<span class="unit">${reading.unit}</span>`;
    if (this._config.animate_numbers === false || !canAnimate) {
      return html`<span class="number">${formatNumber(reading.value, this.hass.locale)}</span
        >${unit}`;
    }
    return html`<number-flow
        class="number"
        data-value=${reading.value}
        .format=${{ maximumFractionDigits: reading.decimals }}
        .locales=${this.hass.locale ? numberFormatToLocale(this.hass.locale) : undefined}
      ></number-flow
      >${unit}`;
  }

  /** The scene's rendered width sets the label size, so labels scale with the drawing. */
  private _observeWidth() {
    const scene = this.shadowRoot?.querySelector(".stage > svg");
    if (!scene || scene === this._observedScene) {
      return;
    }
    this._observedScene = scene;
    this._resizeObserver?.disconnect();
    this._resizeObserver ??= new ResizeObserver(([entry]) => {
      if (entry) {
        this._width = Math.round(entry.target.getBoundingClientRect().width);
      }
    });
    this._resizeObserver.observe(scene);
    this._width = Math.round(scene.getBoundingClientRect().width);
  }

  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-house-card": PowerFlowHouseCard;
  }
}
