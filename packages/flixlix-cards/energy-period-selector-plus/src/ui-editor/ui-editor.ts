import {
  DURATION_UNITS,
  type DurationUnit,
  durationParts,
  parseStartDate,
  type PeriodDefinition,
} from "@flixlix-cards/shared/states/utils/selected-period";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { mdiChevronUp, mdiClose, mdiPencil, mdiPlus } from "@mdi/js";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type EnergyPeriodSelectorPlusConfig, type PeriodButton } from "../types";

const DEFAULT_PERIOD_BUTTONS: PeriodButton[] = ["day", "week", "month", "year"];
/** Select values of the user's own periods: their position among the defined periods. */
const DEFINED = "defined-";

const BUILT_IN = ["day", "week", "month", "year", "custom"] as const;
const BUILT_IN_LABELS: Record<(typeof BUILT_IN)[number], string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  custom: "Custom",
};

/** Today and compare sit in the period menu; `icon` and `text` both show them there. */
const shownInMenu = (hidden: string | false) => ({
  select: {
    mode: "dropdown",
    options: [
      { value: hidden, label: "Hidden" },
      { value: "text", label: "In the period menu" },
    ],
  },
});

const shown = (value: unknown) => value === "icon" || value === "text";

const isDefinition = (button: PeriodButton): button is PeriodDefinition =>
  typeof button === "object";

const definitionsOf = (buttons: PeriodButton[]) => buttons.filter(isDefinition);

/** The period buttons as select values; the user's own periods by their position. */
const toSelectValues = (buttons: PeriodButton[]) => {
  let defined = 0;
  return buttons.map((button) => (isDefinition(button) ? `${DEFINED}${defined++}` : button));
};

const fromSelectValues = (values: string[], buttons: PeriodButton[]): PeriodButton[] => {
  const definitions = definitionsOf(buttons);
  return values.flatMap((value): PeriodButton[] => {
    if (value.startsWith(DEFINED)) {
      const definition = definitions[Number(value.slice(DEFINED.length))];
      return definition ? [definition] : [];
    }
    const builtIn = BUILT_IN.find((period) => period === value);
    return builtIn ? [builtIn] : [];
  });
};

const topSchema = (config: EnergyPeriodSelectorPlusConfig, buttons: PeriodButton[]) => [
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "card_background", selector: { boolean: {} } },
      { name: "prev_next_buttons", selector: { boolean: {} } },
      { name: "date_picker", selector: { boolean: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "today_button_type", selector: shownInMenu(false) },
      { name: "compare_button_type", selector: shownInMenu("") },
      ...(shown(config.compare_button_type)
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
          ...BUILT_IN.map((value) => ({ value, label: BUILT_IN_LABELS[value] })),
          ...definitionsOf(buttons).map((definition, index) => ({
            value: `${DEFINED}${index}`,
            label: definition.label,
          })),
        ],
      },
    },
  },
];

const bottomSchema = (buttons: PeriodButton[]) => [
  ...(buttons.includes("custom") ? [{ name: "custom_period_label", selector: { text: {} } }] : []),
  { name: "collection_key", selector: { text: {} } },
];

const UNIT_LABELS: Record<DurationUnit, string> = {
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
};

const definitionSchema = [
  { name: "label", required: true, selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "count", required: true, selector: { number: { min: 1, mode: "box" } } },
      {
        name: "unit",
        required: true,
        selector: {
          select: {
            mode: "dropdown",
            options: DURATION_UNITS.map((value) => ({ value, label: UNIT_LABELS[value] })),
          },
        },
      },
    ],
  },
  { name: "starts", selector: { date: {} } },
];

type DefinitionFormData = { label?: string; count?: number; unit?: DurationUnit; starts?: string };

const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const toFormData = (definition: PeriodDefinition): DefinitionFormData => {
  const parts = durationParts(definition.duration);
  const starts = parseStartDate(definition.starts);
  return {
    label: definition.label,
    count: parts?.count,
    unit: parts?.unit,
    ...(starts ? { starts: isoDay(starts) } : {}),
  };
};

const fromFormData = (
  { label, count, unit, starts }: DefinitionFormData,
  previous: PeriodDefinition
): PeriodDefinition => ({
  label: label ?? "",
  duration: unit && count ? { [unit]: count } : previous.duration,
  ...(starts ? { starts } : {}),
});

/** "Every month from 2026-01-08", "Last 30 days". */
const describeDefinition = (definition: PeriodDefinition) => {
  const parts = durationParts(definition.duration);
  if (!parts) {
    return "";
  }
  const length =
    parts.count === 1 ? parts.unit.slice(0, -1) : `${String(parts.count)} ${parts.unit}`;
  const starts = parseStartDate(definition.starts);
  return starts ? `Every ${length} from ${isoDay(starts)}` : `Last ${length}, ending today`;
};

const LABELS: Record<string, string> = {
  title: "Title",
  card_background: "Card background",
  prev_next_buttons: "Previous/next buttons",
  date_picker: "Calendar button in every period",
  today_button_type: "Today button",
  compare_button_type: "Compare",
  compare_button_label: "Compare label",
  period_buttons: "Period buttons",
  custom_period_label: "Custom period label",
  collection_key: "Collection key (only to drive another energy dashboard)",
  label: "Label",
  count: "Length",
  unit: "Unit",
  starts: "A day a period starts on (empty: the period ends today)",
};

const computeLabel = (field: { name: string }) => LABELS[field.name] ?? field.name;

@customElement("energy-period-selector-plus-editor")
export class EnergyPeriodSelectorPlusEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyPeriodSelectorPlusConfig;
  /** Which of the user's own periods is open for editing, by position among them. */
  @state() private _editing = -1;

  public setConfig(config: EnergyPeriodSelectorPlusConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaForm().then(() => this.requestUpdate());
  }

  private get _buttons() {
    return this._config?.period_buttons ?? DEFAULT_PERIOD_BUTTONS;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const buttons = this._buttons;
    const data = {
      prev_next_buttons: true,
      today_button_type: "text",
      compare_button_type: "",
      ...this._config,
      ...(this._config.today_button_type === "icon" ? { today_button_type: "text" } : {}),
      ...(this._config.compare_button_type === "icon" ? { compare_button_type: "text" } : {}),
      period_buttons: toSelectValues(buttons),
    };
    return html`<ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${topSchema(this._config, buttons)}
        .computeLabel=${computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${this._renderDefinitions(definitionsOf(buttons))}
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${bottomSchema(buttons)}
        .computeLabel=${computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>`;
  }

  private _renderDefinitions(definitions: PeriodDefinition[]) {
    return html`<div class="definitions">
      <div class="heading">Your periods, like a billing cycle</div>
      ${definitions.map(
        (definition, index) =>
          html`<div class="definition">
              <div class="text">
                <span>${definition.label}</span>
                <span class="secondary">${describeDefinition(definition)}</span>
              </div>
              <ha-icon-button
                .label=${nonEmpty(this.hass.localize("ui.common.edit")) ?? "Edit"}
                .path=${this._editing === index ? mdiChevronUp : mdiPencil}
                @click=${() => (this._editing = this._editing === index ? -1 : index)}
              ></ha-icon-button>
              <ha-icon-button
                .label=${nonEmpty(this.hass.localize("ui.common.delete")) ?? "Delete"}
                .path=${mdiClose}
                class="remove"
                @click=${() => this._removeDefinition(definition)}
              ></ha-icon-button>
            </div>
            ${
              this._editing === index
                ? html`<ha-form
                    .hass=${this.hass}
                    .data=${toFormData(definition)}
                    .schema=${definitionSchema}
                    .computeLabel=${computeLabel}
                    @value-changed=${(event: CustomEvent<{ value: DefinitionFormData }>) =>
                      this._editDefinition(definition, event)}
                  ></ha-form>`
                : nothing
            }`
      )}
      <ha-button appearance="plain" size="small" @click=${this._addDefinition}>
        <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
        Add period
      </ha-button>
    </div>`;
  }

  private _writeButtons(buttons: PeriodButton[]) {
    if (this._config) {
      fireEvent(this, "config-changed", { config: { ...this._config, period_buttons: buttons } });
    }
  }

  private _addDefinition = () => {
    const today = new Date();
    const definition: PeriodDefinition = {
      label: "Billing",
      duration: { months: 1 },
      starts: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)),
    };
    this._editing = definitionsOf(this._buttons).length;
    this._writeButtons([...this._buttons, definition]);
  };

  private _removeDefinition(definition: PeriodDefinition) {
    this._editing = -1;
    this._writeButtons(this._buttons.filter((button) => button !== definition));
  }

  private _editDefinition(
    definition: PeriodDefinition,
    event: CustomEvent<{ value: DefinitionFormData }>
  ) {
    event.stopPropagation();
    const edited = fromFormData(event.detail.value, definition);
    this._writeButtons(this._buttons.map((button) => (button === definition ? edited : button)));
  }

  private _valueChanged = (
    event: CustomEvent<{ value: EnergyPeriodSelectorPlusConfig & { period_buttons: string[] } }>
  ) => {
    const config = {
      ...event.detail.value,
      period_buttons: fromSelectValues(event.detail.value.period_buttons, this._buttons),
    };
    // Unselecting one of the user's own periods in the chips removes it.
    if (definitionsOf(config.period_buttons).length < definitionsOf(this._buttons).length) {
      this._editing = -1;
    }
    fireEvent(this, "config-changed", { config });
  };

  static styles = css`
    .definitions {
      margin: 16px 0;
    }
    .heading {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .definition {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 48px;
    }
    .text {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      min-width: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: 0.875em;
    }
    ha-icon-button {
      --mdc-icon-button-size: 36px;
      color: var(--secondary-text-color);
    }
    .definition + ha-form {
      display: block;
      margin-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus-editor": EnergyPeriodSelectorPlusEditor;
  }
}
