import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import { nodeBaseStyles } from "./_node-shared";
import "./number-flow";

@customElement("flixlix-battery-node")
export class FlixlixBatteryNode extends LitElement {
  @property({ type: String }) icon = "mdi:battery";
  @property({ type: String }) accent = "var(--energy-battery-out-color, #f06292)";
  @property({ type: Number, attribute: "state-of-charge" }) stateOfCharge: number | null = null;
  /** Hides the percentage text only — the SoC ring is always driven by the value. */
  @property({ type: Boolean, attribute: "show-soc" }) showSoc = true;
  @property({ type: String }) locale: string | undefined;
  @property({ type: Number, attribute: "transition-ms" }) transitionMs = 600;
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Boolean, reflect: true }) charging = false;

  protected render() {
    const soc = clampSoc(this.stateOfCharge);
    const radius = 26.5;
    const circumference = 2 * Math.PI * radius;
    const dash = soc !== null ? (soc / 100) * circumference : 0;
    const style = `--flixlix-node-accent: ${this.accent};`;
    return html`
      <div class="bubble" part="bubble" style=${style}>
        <svg class="ring" viewBox="0 0 56 56" aria-hidden="true">
          ${svg`<circle class="ring-track" cx="28" cy="28" r="${radius}" fill="none" stroke-width="1.5"></circle>`}
          ${soc !== null
            ? svg`<circle
                class="ring-progress"
                cx="28"
                cy="28"
                r="${radius}"
                fill="none"
                stroke-width="1.5"
                stroke-dasharray="${dash} ${circumference}"
                stroke-linecap="round"
                transform="rotate(-90 28 28)"
              ></circle>`
            : nothing}
        </svg>
        <div class="content" data-soc=${soc !== null && this.showSoc ? "yes" : "no"}>
          <ha-icon class="icon" .icon=${this.icon}></ha-icon>
          ${soc !== null && this.showSoc
            ? html`<flixlix-number-flow
                class="soc"
                .value=${soc}
                .decimals=${0}
                .unit=${"%"}
                .locale=${this.locale}
                .duration=${this.transitionMs}
              ></flixlix-number-flow>`
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = [
    nodeBaseStyles,
    css`
      .bubble {
        position: relative;
        width: 56px;
        height: 56px;
        transition:
          box-shadow 280ms ease,
          transform 200ms ease;
      }

      .ring {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .ring-track {
        stroke: color-mix(in srgb, var(--flixlix-node-accent) 22%, transparent);
      }

      .ring-progress {
        stroke: var(--flixlix-node-accent);
        transition: stroke-dasharray 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
      }

      .content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        line-height: 1;
      }

      .content[data-soc="no"] .icon {
        --mdc-icon-size: 26px;
      }
      .content[data-soc="yes"] .icon {
        --mdc-icon-size: 20px;
      }

      .soc {
        font-size: 10px;
        font-weight: 500;
        color: var(--flixlix-node-accent);
      }
    `,
  ];
}

function clampSoc(value: number | null): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-battery-node": FlixlixBatteryNode;
  }
}
