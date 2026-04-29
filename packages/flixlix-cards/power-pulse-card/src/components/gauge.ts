import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./number-flow";

/**
 * Wide-semicircle gauge modelled on Home Assistant's `ha-gauge`. Two
 * intentional deviations: rounded line caps (so the viewBox extends past
 * the chord by half-stroke to fit them), and the value rendered as an HTML
 * overlay rather than an SVG `<text>` so it can use `flixlix-number-flow`.
 *
 * Progress is shown by *decreasing* `stroke-dashoffset` toward 0. On first
 * paint we render with the full arc length as the offset (empty arc), then
 * flip a state flag in `firstUpdated` so the CSS transition plays the
 * fill-in. Subsequent value changes ride the same transition.
 */
export interface GaugeLevel {
  level: number;
  color: string;
}

@customElement("flixlix-gauge")
export class FlixlixGauge extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: String }) label = "";
  @property({ type: String }) accent = "var(--primary-color)";
  /** Optional level → color thresholds. Picks the highest level ≤ value. */
  @property({ attribute: false }) levels?: GaugeLevel[];
  @property({ type: String }) locale: string | undefined;
  @property({ type: Number, attribute: "transition-ms" }) transitionMs = 800;

  @state() private _mounted = false;

  protected firstUpdated(): void {
    // rAF fires after the browser paints the initial empty state, so the
    // CSS transition picks up the offset change.
    requestAnimationFrame(() => {
      this._mounted = true;
    });
  }

  protected render() {
    const radius = 40;
    const arcLength = Math.PI * radius;
    const v = Math.max(0, Math.min(100, this.value));
    const dashOffset = this._mounted ? arcLength * (1 - v / 100) : arcLength;
    const accent = pickLevelColor(v, this.levels) ?? this.accent;

    const style = `--gauge-accent: ${accent}; --gauge-transition: ${this.transitionMs}ms;`;
    return html`
      <div class="root" style=${style}>
        <div class="gauge-wrap">
          <svg viewBox="-50 -50 100 59" class="gauge" aria-hidden="true">
            ${svg`<path
              class="track"
              d="M -40 0 A 40 40 0 0 1 40 0"
            ></path>`} ${svg`<path
              class="value"
              d="M -40 0 A 40 40 0 0 1 40 0"
              stroke-dasharray="${arcLength}"
              stroke-dashoffset="${dashOffset}"
            ></path>`}
          </svg>
          <flixlix-number-flow
            class="value-text"
            .value=${v}
            .decimals=${0}
            .unit=${"%"}
            .locale=${this.locale}
            .duration=${this.transitionMs}
          ></flixlix-number-flow>
        </div>
        ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: inline-flex;
    }

    .root {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      width: 96px;
    }

    .gauge-wrap {
      position: relative;
      width: 100%;
      line-height: 0;
    }

    .gauge {
      width: 100%;
      height: auto;
      display: block;
    }

    .track {
      fill: none;
      stroke: color-mix(in srgb, var(--gauge-accent) 18%, transparent);
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke var(--gauge-transition, 800ms) ease;
    }

    .value {
      fill: none;
      stroke: var(--gauge-accent);
      stroke-width: 12;
      stroke-linecap: round;
      transition:
        stroke-dashoffset var(--gauge-transition, 800ms) cubic-bezier(0.22, 0.61, 0.36, 1),
        stroke var(--gauge-transition, 800ms) ease;
    }

    /* top: 80% sits the digits just above the chord, where there's the
       most room inside the arc. */
    .value-text {
      position: absolute;
      left: 50%;
      top: 80%;
      transform: translate(-50%, -50%);
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-text-color);
      line-height: 1;
    }

    .label {
      margin-top: 2px;
      font-size: 11px;
      color: var(--secondary-text-color);
      text-align: center;
      line-height: 1.1;
    }
  `;
}

function pickLevelColor(value: number, levels: GaugeLevel[] | undefined): string | undefined {
  if (!levels || levels.length === 0) return undefined;
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  let chosen = sorted[0]!.color;
  for (const lvl of sorted) {
    if (value >= lvl.level) chosen = lvl.color;
    else break;
  }
  return chosen;
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-gauge": FlixlixGauge;
  }
}
