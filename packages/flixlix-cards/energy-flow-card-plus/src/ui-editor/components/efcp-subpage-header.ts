import localize from "@flixlix-cards/shared/i18n";
import { type ConfigPage, type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { mdiArrowLeft } from "@mdi/js";
import { fireEvent, type HomeAssistant } from "custom-card-helpers";
import { css, type CSSResultGroup, html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit-element";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
  }
}

@customElement("efcp-subpage-header")
export class SubpageHeader extends LitElement {
  public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: PowerFlowCardPlusConfig;
  @property() protected page?: ConfigPage;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button
            .label=${"Go Back"}
            .path=${mdiArrowLeft}
            @click=${this._goBack}
          ></ha-icon-button>
          <span>${localize(`editor.${this.page}`)}</span>
        </div>
      </div>
    `;
  }

  private _goBack(): void {
    fireEvent(this, "go-back");
  }

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
    "efcp-subpage-header": SubpageHeader;
  }
}
