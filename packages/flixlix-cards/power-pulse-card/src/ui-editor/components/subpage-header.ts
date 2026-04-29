import { mdiArrowLeft } from "@mdi/js";
import { fireEvent } from "custom-card-helpers";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HASSDomEvents {
    "flixlix-go-back": undefined;
  }
}

@customElement("flixlix-subpage-header")
export class FlixlixSubpageHeader extends LitElement {
  @property({ type: String }) header = "";

  protected render() {
    return html`
      <div class="header">
        <ha-icon-button
          .label=${"Go Back"}
          .path=${mdiArrowLeft}
          @click=${this._goBack}
        ></ha-icon-button>
        <span class="title">${this.header}</span>
      </div>
    `;
  }

  private _goBack(): void {
    fireEvent(this, "flixlix-go-back");
  }

  static styles = css`
    .header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 12px;
    }

    .title {
      font-size: 18px;
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-subpage-header": FlixlixSubpageHeader;
  }
}
