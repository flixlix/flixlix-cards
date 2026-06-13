import localize from "@flixlix-cards/shared/i18n";
import { type ConfigPage, type LovelaceRowConfig } from "@flixlix-cards/shared/types";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import {
  fireEvent,
  type HomeAssistant,
  type LovelaceCardConfig,
  type LovelaceCardEditor,
} from "custom-card-helpers";
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { assert, type Struct } from "superstruct";

/**
 * Abstract base class for flow-card UI editors.
 *
 * Subclasses must provide:
 *  - `configStruct`   — superstruct Struct used to validate setConfig input
 *  - `configPages`    — ordered list of CONFIG_PAGES entries
 *  - `generalSchema`  — ha-form schema shown on the root (non-subpage) screen
 *  - `advancedSchema` — ha-form schema for the "advanced" subpage
 *  - `_renderLegacyAlerts()` — card-specific legacy-migration alert markup
 *
 * Do NOT add `@customElement` here — each subclass registers its own name.
 */
export abstract class BaseCardEditor<TConfig extends LovelaceCardConfig>
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() protected _config?: TConfig;
  @state() protected _configEntities?: LovelaceRowConfig[] = [];
  @state() protected _currentConfigPage: ConfigPage = null;

  // ── Abstract surface ─────────────────────────────────────────────────────

  protected abstract get configStruct(): Struct<TConfig, any>;

  protected abstract get configPages(): {
    page: ConfigPage;
    icon?: string;
    schema?: any;
  }[];

  /** Schema for the root ha-form (general config). */
  protected abstract get generalSchema(): any;

  /**
   * Schema for the "advanced" subpage.  Receives a localize function and the
   * current `display_zero_lines.mode` value so card-specific options can be built.
   */
  protected abstract advancedSchema(
    localizeFn: (key: string) => string,
    displayZeroLinesMode: string
  ): any;

  /**
   * Override to return legacy-migration alert markup.
   * Return `nothing` if there are no applicable legacy fields.
   */
  protected _renderLegacyAlerts(): TemplateResult | typeof nothing {
    return nothing;
  }

  // ── LovelaceCardEditor ────────────────────────────────────────────────────

  public async setConfig(config: TConfig): Promise<void> {
    assert(config, this.configStruct);
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  protected _editDetailElement(pageClicked: ConfigPage): void {
    this._currentConfigPage = pageClicked;
  }

  protected _goBack(): void {
    this._currentConfigPage = null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
      display_zero_lines: {
        mode: this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode,
        transparency:
          this._config.display_zero_lines?.transparency ??
          defaultValues.displayZeroLines.transparency,
        grey_color:
          this._config.display_zero_lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
      },
    };

    if (this._currentConfigPage !== null) {
      if (this._currentConfigPage === "individual") {
        return html`
          ${this._renderLegacyAlerts()}
          <subpage-header @go-back=${this._goBack} page=${this._currentConfigPage}>
          </subpage-header>
          <individual-devices-editor
            .hass=${this.hass}
            .config=${this._config}
            @config-changed=${this._valueChanged}
          ></individual-devices-editor>
        `;
      }

      const currentPage = this._currentConfigPage;
      const schema =
        currentPage === "advanced"
          ? this.advancedSchema(
              localize,
              this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode
            )
          : this.configPages.find((page) => page.page === currentPage)?.schema;
      const dataForForm = currentPage === "advanced" ? data : (data as any).entities[currentPage];
      return html`
        ${this._renderLegacyAlerts()}
        <subpage-header @go-back=${this._goBack} page=${this._currentConfigPage}> </subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${dataForForm}
          .schema=${schema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

    const renderLinkSubpage = (
      page: ConfigPage,
      fallbackIcon: string | undefined = "mdi:dots-horizontal-circle-outline"
    ) => {
      if (page === null) return nothing;
      const getIconToUse = () => {
        if (page === "individual" || page === "advanced") return fallbackIcon;
        const entityConfig = (this._config as any)?.entities[page] as { icon?: string } | undefined;
        return entityConfig?.icon || fallbackIcon;
      };
      const icon = getIconToUse();
      return html`
        <link-subpage
          path=${page}
          header="${localize(`editor.${page}`)}"
          @open-sub-element-editor=${() => this._editDetailElement(page)}
          icon=${icon}
        >
        </link-subpage>
      `;
    };

    const renderLinkSubPages = () => {
      return this.configPages.map((page) => renderLinkSubpage(page.page, page.icon));
    };

    return html`
      <div class="card-config">
        ${this._renderLegacyAlerts()}
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${this.generalSchema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${renderLinkSubPages()}
      </div>
    `;
  }

  // ── Event handling ────────────────────────────────────────────────────────

  protected _valueChanged(ev: any): void {
    let config = ev.detail.value || "";

    if (!this._config || !this.hass) {
      return;
    }

    if (
      this._currentConfigPage !== null &&
      this._currentConfigPage !== "advanced" &&
      this._currentConfigPage !== "individual"
    ) {
      config = {
        ...this._config,
        entities: {
          ...(this._config as any).entities,
          [this._currentConfigPage]: config,
        },
      };
    }

    fireEvent(this, "config-changed", { config });
  }

  protected _computeLabelCallback = (schema: any) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema?.name}`) ||
    localize(`editor.${schema?.name}`) ||
    schema?.label;

  // ── Styles ────────────────────────────────────────────────────────────────

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .entities-section * {
        background-color: #f00;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 10px;
      }

      .legacy-fields-alert {
        margin-bottom: 8px;
      }

      .legacy-fields-alert-button {
        border: none;
        background: var(--warning-color);
        border-radius: 99px;
        color: var(--card-background-color);
        cursor: pointer;
        font: inherit;
        padding: 4px 8px;
      }

      .config-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .config-header.sub-header {
        margin-top: 24px;
      }

      ha-icon {
        padding-bottom: 2px;
        position: relative;
        top: -4px;
        right: 1px;
      }
    `;
  }
}
