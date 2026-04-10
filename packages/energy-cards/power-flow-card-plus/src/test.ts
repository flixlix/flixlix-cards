import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("power-flow-card-plus")
export class PowerFlowCardPlus extends LitElement {
  @property({ type: String }) title = "Power Flow";

  render() {
    return html`
      <div class="card">
        <h1>${this.title}</h1>
      </div>
    `;
  }
}
