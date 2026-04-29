import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { nodeBaseStyles } from "./_node-shared";
import "./number-flow";

@customElement("flixlix-home-node")
export class FlixlixHomeNode extends LitElement {
  @property({ type: String }) icon = "mdi:home";
  @property({ type: String }) accent = "var(--primary-text-color)";
  @property({ type: Number }) value = 0;
  @property({ type: Number }) decimals = 0;
  @property({ type: String }) unit = "W";
  @property({ type: String }) locale: string | undefined;
  @property({ type: Number, attribute: "transition-ms" }) transitionMs = 600;

  protected render() {
    const style = `--flixlix-node-accent: ${this.accent};`;
    return html`
      <div class="bubble" part="bubble" style=${style}>
        <ha-icon class="icon" .icon=${this.icon}></ha-icon>
        <flixlix-number-flow
          class="value"
          .value=${this.value}
          .decimals=${this.decimals}
          .unit=${this.unit}
          .locale=${this.locale}
          .duration=${this.transitionMs}
        ></flixlix-number-flow>
      </div>
    `;
  }

  static styles = [
    nodeBaseStyles,
    css`
      .bubble {
        width: 72px;
        height: 72px;
        flex-direction: column;
        gap: 2px;
        border: 1px solid var(--flixlix-node-accent);
        transition:
          transform 200ms ease,
          box-shadow 280ms ease;
      }

      .icon {
        --mdc-icon-size: 22px;
      }

      .value {
        font-size: 11px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-home-node": FlixlixHomeNode;
  }
}
