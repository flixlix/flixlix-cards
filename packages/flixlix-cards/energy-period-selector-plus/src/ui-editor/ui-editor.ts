import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type EnergyPeriodSelectorPlusConfig } from "../types";

const buttonStyle = (none: string | false) => ({
  select: {
    mode: "dropdown",
    options: [
      { value: none, label: "Hidden" },
      { value: "icon", label: "Icon" },
      { value: "text", label: "Text" },
    ],
  },
});

const schema = (config: EnergyPeriodSelectorPlusConfig) => [
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "card_background", selector: { boolean: {} } },
      { name: "prev_next_buttons", selector: { boolean: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "today_button_type", selector: buttonStyle(false) },
      { name: "compare_button_type", selector: buttonStyle("") },
      ...(config.compare_button_type === "text"
        ? [{ name: "compare_button_label", selector: { text: {} } }]
        : []),
    ],
  },
  {
    name: "period_buttons",
    selector: {
      select: {
        multiple: true,
        reorder: true,
        options: [
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
          { value: "custom", label: "Custom" },
        ],
      },
    },
  },
  ...(config.period_buttons?.includes("custom")
    ? [{ name: "custom_period_label", selector: { text: {} } }]
    : []),
  { name: "collection_key", selector: { text: {} } },
];

const LABELS: Record<string, string> = {
  title: "Title",
  card_background: "Card background",
  prev_next_buttons: "Previous/next buttons",
  today_button_type: "Today button",
  compare_button_type: "Compare button",
  compare_button_label: "Compare button label",
  period_buttons: "Period buttons",
  custom_period_label: "Custom period label",
  collection_key: "Collection key (only to drive another energy dashboard)",
};

@customElement("energy-period-selector-plus-editor")
export class EnergyPeriodSelectorPlusEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyPeriodSelectorPlusConfig;

  public setConfig(config: EnergyPeriodSelectorPlusConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm().then(() => this.requestUpdate());
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const data = {
      prev_next_buttons: true,
      today_button_type: "text",
      compare_button_type: "",
      period_buttons: ["day", "week", "month", "year"],
      ...this._config,
    };
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema(this._config)}
      .computeLabel=${(field: { name: string }) => LABELS[field.name] ?? field.name}
      @value-changed=${this._valueChanged}
    ></ha-form>`;
  }

  private _valueChanged = (event: CustomEvent<{ value: EnergyPeriodSelectorPlusConfig }>) => {
    fireEvent(this, "config-changed", { config: event.detail.value });
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus-editor": EnergyPeriodSelectorPlusEditor;
  }
}
