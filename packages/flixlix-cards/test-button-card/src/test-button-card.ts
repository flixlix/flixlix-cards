import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("test-button-card")
export class TestButtonCard extends LitElement {
  private _config?: { name?: string };

  static properties = {
    _config: { state: true },
  };

  setConfig(config: { name?: string }) {
    this._config = config;
  }

  render() {
    return html`
      <ha-card>
        <div class="card-content">
          <button @click=${() => alert("Hello from Monorepo!")}>
            ${this._config?.name || "Test Button"}
          </button>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .card-content {
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    button {
      padding: 8px 16px;
      cursor: pointer;
    }
  `;
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "test-button-card",
  name: "Test Button Card",
  description: "A proof of concept card from the monorepo",
});