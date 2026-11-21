import {
  energyDefaultPeriodStorageKey,
  findEnergyCollection,
  watchGlobalEnergyPeriodChanges,
} from "@flixlix-cards/shared/states/utils/energy-period";
import {
  CALENDAR_PERIODS,
  type CalendarPeriod,
  type DateRange,
  detectPeriod,
  firstWeekday,
  HA_PERIOD_PRESET,
  type Period,
  type PeriodContext,
  periodDefinitionError,
  periodRange,
  type SelectedPeriod,
  shiftPeriod,
} from "@flixlix-cards/shared/states/utils/selected-period";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import {
  type HomeAssistant,
  type LovelaceCard,
  type LovelaceCardEditor,
} from "custom-card-helpers";
import { css, html, LitElement, nothing, type PropertyValues, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { version } from "../package.json";
import { EnergyPeriodSelectorPlusEditor } from "./ui-editor/ui-editor";
import { type EnergyPeriodSelectorPlusConfig, type PeriodButton } from "./types";

registerCustomCard({
  type: "energy-period-selector-plus",
  name: "Energy Period Selector Plus",
  description: "Pick the period shown by the energy cards on this dashboard.",
  version: version,
});

/** Dropdown item values of the period buttons: their position in `period_buttons`. */
const PERIOD_ITEM = "period-";
const PERIODS: readonly SelectedPeriod[] = ["day", "week", "month", "year", "custom"];
const DEFAULT_PERIOD_BUTTONS: PeriodButton[] = ["day", "week", "month", "year"];
// ponytail: fixed grace period for HA's lazily loaded energy cards to create their collection;
// on a slow device a hidden date picker may be added needlessly, which is harmless.
const COLLECTION_GRACE_MS = 1500;

const isSelectedPeriod = (value: unknown): value is SelectedPeriod =>
  PERIODS.some((period) => period === value);

/** Why a `period_buttons` entry is invalid, or undefined if it is a valid one. */
const periodButtonError = (value: unknown) =>
  typeof value === "string"
    ? isSelectedPeriod(value)
      ? undefined
      : `must be one of ${PERIODS.join(", ")}`
    : periodDefinitionError(value);

const icon = (path: string) =>
  html`<svg viewBox="0 0 24 24" aria-hidden="true">${svg`<path d=${path}></path>`}</svg>`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

type CardHelpers = { createCardElement: (config: object) => unknown };

const isCardHelpers = (value: unknown): value is CardHelpers =>
  typeof value === "object" &&
  value !== null &&
  "createCardElement" in value &&
  typeof value.createCardElement === "function";

/** Creates one of HA's own cards; creating it makes HA load the card's module and elements. */
const createHaCard = async (
  config: object,
  stillNeeded: () => boolean = () => true
): Promise<unknown> => {
  const helpers = await window.loadCardHelpers?.();
  return isCardHelpers(helpers) && stillNeeded() ? helpers.createCardElement(config) : undefined;
};

/** HA's date range picker: a calendar popover with presets, as in HA's energy period selector. */
const DATE_PICKER = "ha-date-range-picker";

type DateRangeChangedEvent = CustomEvent<{ value?: { startDate?: unknown; endDate?: unknown } }>;

const hasOpen = (element: Element | null): element is Element & { open: () => void } =>
  element !== null && "open" in element && typeof element.open === "function";

@customElement("energy-period-selector-plus")
export class EnergyPeriodSelectorPlus extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyPeriodSelectorPlusConfig;
  @state() private _range?: DateRange;
  @state() private _period?: Period | "custom";
  @state() private _compare = false;
  /** HA's own date selection card, kept hidden, so HA creates the energy collection. */
  @state() private _collectionCreator?: HTMLElement;

  private _unwatch?: () => void;
  private _datePickerRequested = false;
  private _creatorTimer?: ReturnType<typeof setTimeout>;

  public static getConfigElement(): LovelaceCardEditor {
    return new EnergyPeriodSelectorPlusEditor();
  }

  public static getStubConfig(): EnergyPeriodSelectorPlusConfig {
    return { type: "custom:energy-period-selector-plus", card_background: true };
  }

  public getCardSize(): number {
    return 1;
  }

  public setConfig(config: EnergyPeriodSelectorPlusConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (config.collection_key && !config.collection_key.startsWith("energy_")) {
      throw new Error("`collection_key` must start with `energy_`, like in HA's energy cards");
    }
    const buttons: unknown = config.period_buttons;
    if (buttons !== undefined) {
      if (!Array.isArray(buttons)) {
        throw new Error("`period_buttons` must be a list");
      }
      buttons.forEach((button, index) => {
        const error = periodButtonError(button);
        if (error) {
          throw new Error(`\`period_buttons\` entry ${index + 1} ${error}`);
        }
      });
    }
    const keyChanged = config.collection_key !== this._config?.collection_key;
    this._config = config;
    // Edited periods are new objects; find the selected one among them again.
    if (this._range && this._period !== "custom") {
      this._period = undefined;
      this._period = this._detectPeriod(this._range);
    }
    if (keyChanged && this._unwatch) {
      this._watch();
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._watch();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unwatch?.();
    this._unwatch = undefined;
    clearTimeout(this._creatorTimer);
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (this._datePickerShown) {
      void this._loadDatePicker();
    }
    if (!changed.has("hass")) {
      return;
    }
    if (!this._unwatch && this.isConnected) {
      this._watch();
    }
    if (this._collectionCreator) {
      Object.assign(this._collectionCreator, { hass: this.hass });
    }
  }

  /** HA's calendar opens from the date in custom mode, and in every mode with `date_picker`. */
  private get _datePickerShown() {
    return this._period === "custom" || this._config?.date_picker === true;
  }

  private get _periodContext(): PeriodContext {
    return { weekStartsOn: firstWeekday(this.hass.locale), now: new Date() };
  }

  private get _periodButtons() {
    return this._config?.period_buttons ?? DEFAULT_PERIOD_BUTTONS;
  }

  /**
   * The selected period if it still covers the range, else the first button that does, so a
   * period that matches another one (a billing cycle starting on the 1st, a month) stays selected.
   */
  private _detectPeriod(range: DateRange) {
    const shown = this._periodButtons.filter((button): button is Period => button !== "custom");
    const current = this._period && this._period !== "custom" ? [this._period] : [];
    return detectPeriod(range, this._periodContext, [...current, ...shown, ...CALENDAR_PERIODS]);
  }

  private get _collection() {
    return findEnergyCollection(this.hass, this._config?.collection_key);
  }

  private _watch() {
    this._unwatch?.();
    this._unwatch =
      watchGlobalEnergyPeriodChanges(
        this.hass,
        () => this._readCollection(),
        this._config?.collection_key
      ) ?? undefined;
    this._readCollection();
    if (!this._collection) {
      clearTimeout(this._creatorTimer);
      this._creatorTimer = setTimeout(() => void this._createCollection(), COLLECTION_GRACE_MS);
    }
  }

  private _readCollection() {
    const collection = this._collection;
    if (!collection) {
      return;
    }
    const range = { start: collection.start, end: collection.end ?? endOfDay(new Date()) };
    this._range = range;
    this._compare = Boolean(collection.compare);
    if (this._period !== "custom") {
      this._period = this._detectPeriod(range);
    }
  }

  /**
   * Only HA's energy cards create the collection. On a dashboard without one, a hidden HA date
   * selection card creates it with HA's own, always current, data loader.
   */
  private async _createCollection() {
    if (this._collectionCreator) {
      return;
    }
    const card = await createHaCard(
      {
        type: "energy-date-selection",
        ...(this._config?.collection_key ? { collection_key: this._config.collection_key } : {}),
      },
      () => !this._collection
    );
    if (card instanceof HTMLElement) {
      this._collectionCreator = Object.assign(card, { hass: this.hass });
    }
  }

  /**
   * HA only loads its date range picker with the cards that use it. Creating HA's energy date
   * selection card loads it; the picker already rendered here upgrades once it is defined.
   */
  private async _loadDatePicker() {
    if (this._datePickerRequested || customElements.get(DATE_PICKER)) {
      return;
    }
    this._datePickerRequested = true;
    await createHaCard({ type: "energy-date-selection" });
  }

  private _setRange(range: DateRange) {
    const collection = this._collection;
    if (!collection) {
      return;
    }
    collection.setPeriod(range.start, range.end);
    void collection.refresh();
  }

  private _selectPeriod(period: PeriodButton) {
    this._period = period;
    if (period === "custom" || !this._range) {
      return;
    }
    const context = this._periodContext;
    const { now } = context;
    const showsNow = this._range.start <= now && now <= this._range.end;
    this._setRange(periodRange(period, showsNow ? now : this._range.start, context));
    if (typeof period === "string") {
      this._rememberPeriod(period);
    }
  }

  /** HA opens the dashboard on the period picked last, like after picking a preset in HA. */
  private _rememberPeriod(period: CalendarPeriod) {
    try {
      localStorage.setItem(
        energyDefaultPeriodStorageKey(this.hass, this._config?.collection_key),
        HA_PERIOD_PRESET[period]
      );
    } catch {
      // Storage is unavailable (private mode); the period still applies to this page.
    }
  }

  private _shift(step: 1 | -1) {
    if (this._range && this._period) {
      this._setRange(shiftPeriod(this._period, this._range, step, this._periodContext));
    }
  }

  private _pickToday = () => {
    const period = this._period === "custom" || !this._period ? "day" : this._period;
    const context = this._periodContext;
    this._setRange(periodRange(period, context.now, context));
  };

  private _toggleCompare = () => {
    const collection = this._collection;
    if (!collection) {
      return;
    }
    collection.setCompare(collection.compare ? "" : "previous");
    void collection.refresh();
  };

  private _dateRangeChanged = (event: DateRangeChangedEvent) => {
    const { startDate, endDate } = event.detail.value ?? {};
    if (!(startDate instanceof Date && endDate instanceof Date)) {
      return;
    }
    const range = { start: startOfDay(startDate), end: endOfDay(endDate) };
    if (this._period !== "custom") {
      this._period = this._detectPeriod(range);
    }
    this._setRange(range);
  };

  private _openDatePicker() {
    const picker = this.renderRoot.querySelector(DATE_PICKER);
    if (hasOpen(picker)) {
      picker.open();
    }
  }

  /** HA's dropdown reports the picked item; its `value` says what it stands for. */
  private _menuPicked = (event: Event) => {
    const detail: unknown = "detail" in event ? event.detail : undefined;
    const item =
      typeof detail === "object" && detail !== null && "item" in detail ? detail.item : undefined;
    const value = item instanceof Element ? item.getAttribute("value") : null;
    if (value === "today") {
      this._pickToday();
    } else if (value === "compare") {
      this._toggleCompare();
    } else if (value?.startsWith(PERIOD_ITEM)) {
      const period = this._periodButtons[Number(value.slice(PERIOD_ITEM.length))];
      if (period) {
        this._pickFromMenu(period);
      }
    }
  };

  private _pickFromMenu(period: PeriodButton) {
    this._selectPeriod(period);
    if (period === "custom") {
      // Opened after this click is done: HA's calendar closes on clicks outside it.
      void this.updateComplete
        .then(() => customElements.whenDefined(DATE_PICKER))
        .then(() => setTimeout(() => this._openDatePicker()));
    }
  }

  private _localize(key: string, fallback: string) {
    return nonEmpty(this.hass.localize(key)) ?? fallback;
  }

  private _periodLabel(period: PeriodButton) {
    if (typeof period === "object") {
      return period.label;
    }
    return period === "custom"
      ? (this._config?.custom_period_label ?? "Custom")
      : this._localize(`ui.components.calendar.event.rrule.${period}`, period);
  }

  private _rangeLabel({ start, end }: DateRange) {
    const { language } = this.hass.locale;
    if (this._period === "day") {
      // Short month, as in ranges: the label shares one row with the period and the arrows.
      return start.toLocaleDateString(language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    if (this._period === "month") {
      return start.toLocaleDateString(language, { year: "numeric", month: "long" });
    }
    if (this._period === "year") {
      return String(start.getFullYear());
    }
    return new Intl.DateTimeFormat(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).formatRange(start, end);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const content = html`${this._renderSelector()}
      <div hidden>${this._collectionCreator}</div>`;
    return this._config.card_background
      ? html`<ha-card .header=${this._config.title}>
          <div class="card-content" ?data-header=${Boolean(this._config.title)}>${content}</div>
        </ha-card>`
      : content;
  }

  private _renderSelector() {
    const range = this._range;
    if (!range) {
      return html`<div class="waiting">
        ${this._localize("ui.panel.lovelace.cards.energy.loading", "Loading…")}
      </div>`;
    }
    const navigation = this._config?.prev_next_buttons !== false;
    // As in HA's own energy period selector: the date, then previous and next together.
    return html`<div class="selector">
      <span class="label">${this._rangeLabel(range)}</span>
      ${navigation ? this._renderNavButton(-1) : nothing}
      ${navigation ? this._renderNavButton(1) : nothing}
      ${this._datePickerShown ? this._renderDatePicker(range) : nothing} ${this._renderMenu()}
    </div>`;
  }

  private _renderNavButton(step: 1 | -1) {
    const label =
      step === -1
        ? this._localize("ui.panel.lovelace.components.energy_period_selector.previous", "Previous")
        : this._localize("ui.panel.lovelace.components.energy_period_selector.next", "Next");
    return html`<button
      class="icon-button nav"
      title=${label}
      aria-label=${label}
      @click=${() => this._shift(step)}
    >
      ${icon(step === -1 ? mdiChevronLeft : mdiChevronRight)}
    </button>`;
  }

  /** HA's own calendar; its icon button opens it, as do the custom period and `date_picker`. */
  private _renderDatePicker(range: DateRange) {
    return html`<ha-date-range-picker
      minimal
      .hass=${this.hass}
      .startDate=${range.start}
      .endDate=${range.end}
      @value-changed=${this._dateRangeChanged}
    ></ha-date-range-picker>`;
  }

  /** The period, as in Home Flow Card's view picker: a pill that opens HA's own dropdown. */
  private _renderMenu() {
    const type = this._config?.compare_button_type;
    const compare = type === "icon" || type === "text";
    const today = this._config?.today_button_type !== false;
    return html`<ha-dropdown placement="bottom-end" @wa-select=${this._menuPicked}>
      <button slot="trigger" type="button" class="period-trigger">
        <span>${this._periodLabel(this._period ?? "custom")}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
      </button>
      ${this._periodButtons.map(
        (period, index) =>
          html`<ha-dropdown-item
            class=${typeof period === "object" ? "defined" : "built-in"}
            value=${`${PERIOD_ITEM}${String(index)}`}
            ?selected=${this._period === period}
          >
            ${this._periodLabel(period)}
          </ha-dropdown-item>`
      )}
      ${today || compare ? html`<wa-divider></wa-divider>` : nothing}
      ${
        today
          ? html`<ha-dropdown-item value="today">
              ${this._localize("ui.panel.lovelace.components.energy_period_selector.now", "Today")}
            </ha-dropdown-item>`
          : nothing
      }
      ${
        compare
          ? html`<ha-dropdown-item type="checkbox" value="compare" ?checked=${this._compare}>
              ${
                this._config?.compare_button_label ??
                this._localize(
                  "ui.panel.lovelace.components.energy_period_selector.compare",
                  "Compare"
                )
              }
            </ha-dropdown-item>`
          : nothing
      }
    </ha-dropdown>`;
  }

  static styles = css`
    :host {
      display: block;
      /* Home Flow Card's view picker track: the text color, faint, on the card. */
      --eps-track: color-mix(
        in srgb,
        var(--primary-text-color, #212121) 7%,
        var(--card-background-color, #fff)
      );
      --eps-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    }
    .card-content {
      padding: 16px;
    }
    .card-content[data-header] {
      padding-top: 0;
    }
    .waiting {
      color: var(--secondary-text-color);
    }
    .selector {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .label {
      flex: 1;
      min-width: 0;
      font-size: 18px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .icon-button {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition:
        background-color 150ms ease-out,
        transform 100ms ease-out;
    }
    .icon-button:active {
      transform: scale(0.94);
    }
    .icon-button:focus-visible,
    .period-trigger:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .icon-button svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }
    .nav svg:dir(rtl) {
      transform: scaleX(-1);
    }
    ha-dropdown {
      flex: none;
      margin-inline-start: 4px;
    }
    .period-trigger {
      display: flex;
      align-items: center;
      gap: 0.35em;
      margin: 0;
      border: 0;
      border-radius: 999px;
      padding: 0.6em 0.75em 0.6em 1em;
      background: var(--eps-track);
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
      color: var(--primary-text-color);
      cursor: pointer;
      text-transform: capitalize;
      -webkit-tap-highlight-color: transparent;
      transition:
        background-color 150ms ease-out,
        transform 160ms var(--eps-ease-out);
    }
    .period-trigger:active {
      transform: scale(0.97);
    }
    .period-trigger svg {
      width: 1.2em;
      height: 1.2em;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 200ms var(--eps-ease-out);
    }
    .period-trigger[aria-expanded="true"] {
      background: color-mix(in srgb, var(--eps-track), var(--primary-text-color) 8%);
    }
    .period-trigger[aria-expanded="true"] svg {
      transform: rotate(180deg);
    }
    @media (hover: hover) and (pointer: fine) {
      .icon-button:hover {
        background: var(--eps-track);
      }
      .period-trigger:hover {
        background: color-mix(in srgb, var(--eps-track), var(--primary-text-color) 8%);
      }
    }
    /* HA's period names are lowercase; labels the user wrote are shown as written. */
    ha-dropdown-item.built-in {
      text-transform: capitalize;
    }
    ha-date-range-picker {
      flex: none;
      /* HA's icon buttons are 48px; keep the row as tall as the card's own 36px buttons. */
      --ha-icon-button-size: 36px;
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 22px;
    }
    @media (prefers-reduced-motion: reduce) {
      .period-trigger,
      .period-trigger svg,
      .icon-button {
        transition: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus": EnergyPeriodSelectorPlus;
  }
}
