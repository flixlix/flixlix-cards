import { mdiArrowLeft } from "@mdi/js";
import { fireEvent } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
  }
}

/**
 * The caller passes `header` already translated: the element is shared by every flow card under
 * one tag, so the first card to load defines it, with that card's translations.
 */
export class SubpageHeader extends LitElement {
  @property() public header = "";

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button
            .label=${"Go Back"}
            .path=${mdiArrowLeft}
            @click=${this._goBack}
          ></ha-icon-button>
          <span>${this.header}</span>
        </div>
      </div>
    `;
  }

  private _goBack = (): void => {
    fireEvent(this, "go-back");
  };

  static get styles(): CSSResultGroup {
    return css`
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .back-title {
        display: flex;
        align-items: center;
        font-size: 18px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-subpage-header": SubpageHeader;
  }
}
