import {
  energyDefaultPeriodStorageKey,
  findEnergyCollection,
  watchGlobalEnergyPeriodChanges,
} from "@flixlix-cards/shared/states/utils/energy-period";
import {
  type CalendarPeriod,
  type DateRange,
  detectPeriod,
  firstWeekday,
  HA_PERIOD_PRESET,
  periodRange,
  type SelectedPeriod,
  shiftPeriod,
} from "@flixlix-cards/shared/states/utils/selected-period";
import { registerCustomCard } from "@flixlix-cards/shared/utils/register-custom-card";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import {
  mdiCalendarTodayOutline,
  mdiChevronLeft,
  mdiChevronRight,
  mdiCompare,
  mdiCompareRemove,
} from "@mdi/js";
import {
  type HomeAssistant,
  type LovelaceCard,
  type LovelaceCardEditor,
} from "custom-card-helpers";
import { css, html, LitElement, nothing, type PropertyValues, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { version } from "../package.json";
import { EnergyPeriodSelectorPlusEditor } from "./ui-editor/ui-editor";
import { type EnergyPeriodSelectorPlusConfig } from "./types";

registerCustomCard({
  type: "energy-period-selector-plus",
  name: "Energy Period Selector Plus",
  description: "Pick the period shown by the energy cards on this dashboard.",
  version: version,
});

const PERIODS: readonly SelectedPeriod[] = ["day", "week", "month", "year", "custom"];
const DEFAULT_PERIOD_BUTTONS: SelectedPeriod[] = ["day", "week", "month", "year"];
// ponytail: fixed grace period for HA's lazily loaded energy cards to create their collection;
// on a slow device a hidden date picker may be added needlessly, which is harmless.
const COLLECTION_GRACE_MS = 1500;

const isSelectedPeriod = (value: unknown): value is SelectedPeriod =>
  PERIODS.some((period) => period === value);

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
  @state() private _period?: SelectedPeriod;
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
    if (
      config.period_buttons !== undefined &&
      !(Array.isArray(config.period_buttons) && config.period_buttons.every(isSelectedPeriod))
    ) {
      throw new Error(`\`period_buttons\` must be a list of: ${PERIODS.join(", ")}`);
    }
    const keyChanged = config.collection_key !== this._config?.collection_key;
    this._config = config;
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

  private get _weekStartsOn() {
    return firstWeekday(this.hass.locale);
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
      this._period = detectPeriod(range, this._weekStartsOn);
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

  private _selectPeriod(period: SelectedPeriod) {
    this._period = period;
    if (period === "custom" || !this._range) {
      return;
    }
    const now = new Date();
    const showsNow = this._range.start <= now && now <= this._range.end;
    this._setRange(periodRange(period, showsNow ? now : this._range.start, this._weekStartsOn));
    this._rememberPeriod(period);
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
      this._setRange(shiftPeriod(this._period, this._range, step, this._weekStartsOn));
    }
  }

  private _pickToday = () => {
    const period = this._period === "custom" || !this._period ? "day" : this._period;
    this._setRange(periodRange(period, new Date(), this._weekStartsOn));
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
      this._period = detectPeriod(range, this._weekStartsOn);
    }
    this._setRange(range);
  };

  private _openDatePicker = (event: Event) => {
    // The picker closes on clicks outside it, which this click would otherwise count as.
    event.stopPropagation();
    const picker = this.renderRoot.querySelector(DATE_PICKER);
    if (hasOpen(picker)) {
      picker.open();
    }
  };

  private _localize(key: string, fallback: string) {
    return nonEmpty(this.hass.localize(key)) ?? fallback;
  }

  private _periodLabel(period: SelectedPeriod) {
    return period === "custom"
      ? (this._config?.custom_period_label ?? "Custom")
      : this._localize(`ui.components.calendar.event.rrule.${period}`, period);
  }

  private _rangeLabel({ start, end }: DateRange) {
    const { language } = this.hass.locale;
    if (this._period === "day") {
      return start.toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" });
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
    return html`<div class="selector">
      <div class="range">${this._renderRange(range)}</div>
      <div class="actions">${this._renderPeriodButtons()} ${this._renderCompareButton()}</div>
    </div>`;
  }

  private _renderRange(range: DateRange) {
    return html`${
      this._datePickerShown
        ? this._renderDatePicker(range)
        : html`<span class="label">${this._rangeLabel(range)}</span>`
    }
    ${this._config?.prev_next_buttons === false ? nothing : this._renderPrevNext()}
    ${this._period === "custom" ? nothing : this._renderTodayButton()}`;
  }

  private _renderTodayButton() {
    const type = this._config?.today_button_type;
    if (type === false) {
      return nothing;
    }
    const today = this._localize(
      "ui.panel.lovelace.components.energy_period_selector.now",
      "Today"
    );
    return type === "icon"
      ? html`<button
          class="icon-button"
          title=${today}
          aria-label=${today}
          @click=${this._pickToday}
        >
          ${icon(mdiCalendarTodayOutline)}
        </button>`
      : html`<button class="text-button" @click=${this._pickToday}>${today}</button>`;
  }

  private _renderPrevNext() {
    const previous = this._localize(
      "ui.panel.lovelace.components.energy_period_selector.previous",
      "Previous"
    );
    const next = this._localize("ui.panel.lovelace.components.energy_period_selector.next", "Next");
    return html`<button
        class="icon-button nav"
        title=${previous}
        aria-label=${previous}
        @click=${() => this._shift(-1)}
      >
        ${icon(mdiChevronLeft)}
      </button>
      <button
        class="icon-button nav"
        title=${next}
        aria-label=${next}
        @click=${() => this._shift(1)}
      >
        ${icon(mdiChevronRight)}
      </button>`;
  }

  private _renderDatePicker(range: DateRange) {
    return html`<button class="label range-button" @click=${this._openDatePicker}>
        ${this._rangeLabel(range)}
      </button>
      <ha-date-range-picker
        minimal
        .hass=${this.hass}
        .startDate=${range.start}
        .endDate=${range.end}
        @value-changed=${this._dateRangeChanged}
      ></ha-date-range-picker>`;
  }

  private _renderPeriodButtons() {
    const periods = this._config?.period_buttons ?? DEFAULT_PERIOD_BUTTONS;
    return html`<div class="periods" role="group">
      ${periods.map(
        (period) =>
          html`<button
            aria-pressed=${this._period === period ? "true" : "false"}
            @click=${() => this._selectPeriod(period)}
          >
            ${this._periodLabel(period)}
          </button>`
      )}
    </div>`;
  }

  private _renderCompareButton() {
    const type = this._config?.compare_button_type;
    if (type !== "icon" && type !== "text") {
      return nothing;
    }
    const label =
      this._config?.compare_button_label ??
      this._localize("ui.panel.lovelace.components.energy_period_selector.compare", "Compare");
    const pressed = this._compare ? "true" : "false";
    return type === "icon"
      ? html`<button
          class="icon-button compare"
          title=${label}
          aria-label=${label}
          aria-pressed=${pressed}
          @click=${this._toggleCompare}
        >
          ${icon(this._compare ? mdiCompareRemove : mdiCompare)}
        </button>`
      : html`<button
          class="text-button compare"
          aria-pressed=${pressed}
          @click=${this._toggleCompare}
        >
          ${label}
        </button>`;
  }

  static styles = css`
    :host {
      display: block;
    }
    .card-content {
      padding: 16px;
    }
    .card-content[data-header] {
      padding-top: 0;
    }
    .selector {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 16px;
    }
    .range,
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      min-width: 0;
    }
    .label {
      font-size: 20px;
      margin-inline-end: 4px;
    }
    .waiting {
      color: var(--secondary-text-color);
    }
    button {
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 18px;
      padding: 0 12px;
      height: 36px;
      cursor: pointer;
    }
    button:hover {
      background: var(--secondary-background-color);
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    button[aria-pressed="true"] {
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
    .icon-button {
      display: inline-grid;
      place-items: center;
      width: 36px;
      padding: 0;
      border-color: transparent;
    }
    .icon-button svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }
    .nav svg:dir(rtl) {
      transform: scaleX(-1);
    }
    .periods {
      display: inline-flex;
      flex-wrap: wrap;
    }
    .periods button {
      border-radius: 0;
      margin-inline-start: -1px;
      text-transform: capitalize;
    }
    .periods button:first-child {
      border-start-start-radius: 18px;
      border-end-start-radius: 18px;
      margin-inline-start: 0;
    }
    .periods button:last-child {
      border-start-end-radius: 18px;
      border-end-end-radius: 18px;
    }
    ha-date-range-picker {
      /* HA's icon buttons are 48px; keep the row as tall as the card's own 36px buttons. */
      --ha-icon-button-size: 36px;
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 22px;
    }
    .range-button {
      font-size: 20px;
      font-weight: 400;
      border-color: transparent;
      padding: 0 8px;
      margin-inline-start: -8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus": EnergyPeriodSelectorPlus;
  }
}
