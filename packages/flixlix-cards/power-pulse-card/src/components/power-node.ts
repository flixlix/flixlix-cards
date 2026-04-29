import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { nodeBaseStyles } from "./_node-shared";

@customElement("flixlix-power-node")
export class FlixlixPowerNode extends LitElement {
  @property({ type: String }) icon = "";
  @property({ type: String }) accent = "var(--primary-color)";
  @property({ type: Boolean, reflect: true }) active = false;

  protected render() {
    const style = `--flixlix-node-accent: ${this.accent};`;
    return html`
      <div class="bubble" part="bubble" style=${style}>
        ${this.icon ? html`<ha-icon class="icon" .icon=${this.icon}></ha-icon>` : nothing}
      </div>
    `;
  }

  static styles = [
    nodeBaseStyles,
    css`
      .bubble {
        width: 56px;
        height: 56px;
        border: 1px solid var(--flixlix-node-accent);
        transition:
          box-shadow 280ms ease,
          transform 200ms ease,
          border-color 280ms ease;
      }

      .icon {
        --mdc-icon-size: 26px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-power-node": FlixlixPowerNode;
  }
}
