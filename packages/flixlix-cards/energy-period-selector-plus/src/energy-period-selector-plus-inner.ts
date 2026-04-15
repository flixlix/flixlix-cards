import {
  mdiCheckboxBlankOutline,
  mdiCheckboxOutline,
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiDownload,
  mdiHomeClock,
} from "@mdi/js";
import {
  differenceInCalendarMonths,
  differenceInCalendarYears,
  differenceInDays,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  endOfToday,
  endOfWeek,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import memoizeOne from "memoize-one";
import type { EnergyData } from "./ha/data/energy";
import { CompareMode, downloadEnergyData, getEnergyDataCollection } from "./ha/data/energy";
import {
  calcDate,
  calcDateDifferenceProperty,
  calcDateProperty,
  shiftDateRange,
} from "./ha/datetime/calc_date";
import type { DateRange } from "./ha/datetime/calc_date_range";
import { calcDateRange } from "./ha/datetime/calc_date_range";
import { firstWeekdayIndex } from "./ha/datetime/first_weekday";
import {
  formatDateMonth,
  formatDateMonthShort,
  formatDateVeryShort,
  formatDateYear,
} from "./ha/datetime/format_date";
import { SubscribeMixin } from "./ha/mixins/subscribe-mixin";
import type { HaDateRangePicker, HomeAssistant } from "./ha/types";
import { debounce } from "./ha/util/debounce";

const stopPropagation = (ev: Event) => ev.stopPropagation();

const RANGE_KEYS: DateRange[] = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "this_quarter",
  "this_year",
  "now-7d",
  "now-30d",
  "now-365d",
  "now-12m",
];

interface DateRangePickerRanges {
  [key: string]: [Date, Date];
}

interface OverflowMenuItem {
  path: string;
  label: string;
  disabled?: boolean;
  alwaysCollapse?: boolean;
  hidden?: boolean;
  action: () => void;
}

type VerticalOpeningDirection = "up" | "down";

type OpeningDirection = "right" | "left" | "center" | "inline";

@customElement("energy-period-selector-plus-inner")
export class EnergyPeriodSelectorPlusInner extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "collection-key" }) public collectionKey?: string;

  @property({ type: Boolean, reflect: true }) public narrow?: boolean;

  @property({ type: Boolean, reflect: true }) public fixed?: boolean;

  @property({ type: Boolean, attribute: "allow-compare" }) public allowCompare = true;

  @property({ attribute: "vertical-opening-direction" })
  public verticalOpeningDirection?: VerticalOpeningDirection;

  @property({ attribute: "opening-direction" })
  public openingDirection?: OpeningDirection;

  @property({ type: Boolean, attribute: "hide-overflow" }) public hideOverflow = false;

  @state() _datepickerOpen = false;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _ranges: DateRangePickerRanges = {};

  @state() private _compare = false;

  @state() private _collapseButtons = false;

  @state() private _loading = false;

  private _loadingTimer?: ReturnType<typeof setTimeout>;

  private _resizeObserver?: ResizeObserver;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this.collectionKey,
      }).subscribe((data) => this._updateDates(data)),
    ];
  }

  private _measure() {
    this.narrow = this.offsetWidth < 425;
    this._collapseButtons = this.offsetWidth < 275;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(debounce(() => this._measure(), 250, false));
    }
    this._resizeObserver.observe(this);
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._measure();
    }

    if (
      !this.hasUpdated ||
      (changedProps.has("hass") &&
        (this.hass as any)?.localize !== (changedProps.get("hass") as any)?.localize)
    ) {
      this._ranges = {};
      RANGE_KEYS.forEach((key) => {
        this._ranges[(this.hass as any).localize(`ui.components.date-range-picker.ranges.${key}`)] =
          calcDateRange(this.hass.locale as any, this.hass.config as any, key);
      });
    }
  }

  protected render() {
    if (!this.hass || !this._startDate) {
      return nothing;
    }

    const simpleRange = this._simpleRange(
      this._startDate,
      this._endDate,
      this.hass.locale,
      this.hass.config
    );

    const today = new Date();
    const showStartYear =
      calcDateDifferenceProperty(
        today,
        this._startDate,
        differenceInCalendarYears,
        this.hass.locale as any,
        this.hass.config as any
      ) !== 0;
    const showBothYear =
      this._endDate &&
      calcDateDifferenceProperty(
        this._endDate,
        this._startDate,
        differenceInCalendarYears,
        this.hass.locale as any,
        this.hass.config as any
      ) !== 0;
    const showSubtitleYear = simpleRange !== "year" && (showStartYear || showBothYear);

    const overflowButtons = [
      {
        path: mdiHomeClock,
        label: (this.hass as any).localize(
          "ui.panel.lovelace.components.energy_period_selector.now"
        ),
        alwaysCollapse: true,
        hidden: !this.narrow,
        action: () => this._pickNow(),
      },
      {
        path: this._compare ? mdiCheckboxOutline : mdiCheckboxBlankOutline,
        disabled: !this.allowCompare,
        alwaysCollapse: true,
        label: (this.hass as any).localize(
          "ui.panel.lovelace.components.energy_period_selector.compare"
        ),
        action: () => this._toggleCompare(),
      },
      {
        path: mdiDownload,
        alwaysCollapse: true,
        label: (this.hass as any).localize(
          "ui.panel.lovelace.components.energy_period_selector.download_data"
        ),
        action: () => downloadEnergyData(this.hass, this.collectionKey),
      },
    ] as OverflowMenuItem[];

    const navButtons = [
      {
        path: document.dir === "rtl" ? mdiChevronRight : mdiChevronLeft,
        label: (this.hass as any).localize(
          "ui.panel.lovelace.components.energy_period_selector.previous"
        ),
        action: () => this._pickPrevious(),
      },
      {
        path: document.dir === "rtl" ? mdiChevronLeft : mdiChevronRight,
        label: (this.hass as any).localize(
          "ui.panel.lovelace.components.energy_period_selector.next"
        ),
        action: () => this._pickNext(),
      },
    ] as OverflowMenuItem[];

    const allButtons = [...navButtons, ...overflowButtons];

    return html`
      <div class="row ${classMap({ "datepicker-open": this._datepickerOpen })}">
        <div class="backdrop"></div>
        <div class="content">
          <div class="date-picker-icon">
            <ha-date-range-picker
              .hass=${this.hass}
              .startDate=${this._startDate}
              .endDate=${this._endDate}
              .ranges=${this._ranges}
              .popoverPlacement=${this._getDatePickerPlacement(
                this.verticalOpeningDirection,
                this.openingDirection
              )}
              @change=${this._dateRangeChanged}
              @preset-selected=${this._presetSelected}
              @toggle=${this._handleDatepickerToggle}
              @click=${stopPropagation}
              minimal
            ></ha-date-range-picker>
          </div>
          <div class="date-range" @click=${this._openDatePicker}>
            <ha-ripple></ha-ripple>
            <span class="header-title">
              ${simpleRange === "year"
                ? html`${formatDateYear(
                    this._startDate,
                    this.hass.locale as any,
                    this.hass.config as any
                  )}`
                : html`${simpleRange === "12month" ||
                  simpleRange === "months" ||
                  simpleRange === "quarter"
                    ? html`${formatDateMonthShort(
                        this._startDate,
                        this.hass.locale as any,
                        this.hass.config as any
                      )}–${formatDateMonthShort(
                        this._endDate || new Date(),
                        this.hass.locale as any,
                        this.hass.config as any
                      )}`
                    : html`${simpleRange === "month"
                        ? html`${formatDateMonth(
                            this._startDate,
                            this.hass.locale as any,
                            this.hass.config as any
                          )}`
                        : simpleRange === "day"
                          ? html`${formatDateVeryShort(
                              this._startDate,
                              this.hass.locale as any,
                              this.hass.config as any
                            )}`
                          : html`${formatDateVeryShort(
                              this._startDate,
                              this.hass.locale as any,
                              this.hass.config as any
                            )}–${formatDateVeryShort(
                              this._endDate || new Date(),
                              this.hass.locale as any,
                              this.hass.config as any
                            )}`}`}`}
            </span>
            ${showSubtitleYear
              ? html`
                  <span class="header-subtitle">
                    ${formatDateYear(
                      this._startDate,
                      this.hass.locale as any,
                      this.hass.config as any
                    )}${showBothYear
                      ? html`–${formatDateYear(
                          this._endDate || new Date(),
                          this.hass.locale as any,
                          this.hass.config as any
                        )}`
                      : ``}
                  </span>
                `
              : nothing}
          </div>
          <div class="loading-indicator ${classMap({ "is-loading": this._loading })}">
            <ha-spinner size="tiny"></ha-spinner>
          </div>
          <div class="date-actions">
            ${!this.narrow
              ? html`
                  <ha-button @click=${this._pickNow}>
                    ${(this.hass as any).localize(
                      "ui.panel.lovelace.components.energy_period_selector.now"
                    )}
                  </ha-button>
                `
              : nothing}
            ${allButtons.map((item) =>
              this._collapseButtons || item.alwaysCollapse
                ? nothing
                : html`<ha-icon-button
                    .path=${item.path}
                    .label=${item.label}
                    @click=${item.action}
                  ></ha-icon-button>`
            )}
            ${!this.hideOverflow &&
            (this._collapseButtons || allButtons.some((x) => x.alwaysCollapse))
              ? html`
                  <div class="overflow">
                    <ha-dropdown
                      @opened=${this._handleIconOverflowMenuOpened}
                      @click=${stopPropagation}
                    >
                      <ha-icon-button
                        slot="trigger"
                        .path=${mdiDotsVertical}
                        .label=${"More"}
                      ></ha-icon-button>
                      ${allButtons.map((item) =>
                        (this._collapseButtons || item.alwaysCollapse) && !item.hidden
                          ? html`
                              <ha-dropdown-item .disabled=${item.disabled} @click=${item.action}>
                                <ha-svg-icon slot="start" .path=${item.path}></ha-svg-icon>
                                ${item.label}
                              </ha-dropdown-item>
                            `
                          : nothing
                      )}
                    </ha-dropdown>
                  </div>
                `
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private _simpleRange = memoizeOne(
    (startDate: Date, endDate: Date | undefined, locale: any, config: any): string => {
      if (differenceInDays(endDate!, startDate!) === 0) {
        return "day";
      }
      if (
        (calcDateProperty(startDate, isFirstDayOfMonth, locale, config) as boolean) &&
        (calcDateProperty(endDate!, isLastDayOfMonth, locale, config) as boolean)
      ) {
        if (
          (calcDateDifferenceProperty(
            endDate!,
            startDate,
            differenceInMonths,
            locale,
            config
          ) as number) === 0
        ) {
          return "month";
        }
        if (
          (calcDateDifferenceProperty(
            endDate!,
            startDate,
            differenceInMonths,
            locale,
            config
          ) as number) === 2 &&
          startDate.getMonth() % 3 === 0
        ) {
          return "quarter";
        }
        if (
          calcDateDifferenceProperty(endDate!, startDate, differenceInMonths, locale, config) === 11
        ) {
          if (
            calcDateDifferenceProperty(
              endDate!,
              startDate,
              differenceInCalendarYears,
              locale,
              config
            ) === 0
          ) {
            return "year";
          }
          return "12month";
        }
        return "months";
      }
      return "other";
    }
  );

  private get _datePicker(): HaDateRangePicker | undefined {
    return (
      (this.shadowRoot!.querySelector("ha-date-range-picker") as HaDateRangePicker) ?? undefined
    );
  }

  private _handleIconOverflowMenuOpened(ev: Event) {
    ev.stopPropagation();
  }

  private _openDatePicker(ev: Event) {
    const datePicker = this._datePicker;
    if (datePicker) datePicker.open();
    ev.stopPropagation();
  }

  private _updateCollectionPeriod() {
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(this._startDate!, this._endDate!);
    energyCollection.refresh();
    this._scheduleLoadingIndicator();
  }

  private _dateRangeChanged(ev: any) {
    this._startDate = calcDate(
      ev.detail.value.startDate,
      startOfDay,
      this.hass.locale as any,
      this.hass.config as any
    );
    this._endDate = calcDate(
      ev.detail.value.endDate,
      endOfDay,
      this.hass.locale as any,
      this.hass.config as any
    );

    this._updateCollectionPeriod();
  }

  private _presetSelected(ev: any) {
    const key = RANGE_KEYS[ev.detail.index];
    if (key) {
      localStorage.setItem(`energy-default-period-_${this.collectionKey || "energy"}`, key);
    }
  }

  private _pickNow() {
    if (!this._startDate) return;

    const range = this._simpleRange(
      this._startDate,
      this._endDate,
      this.hass.locale,
      this.hass.config
    );
    const today = new Date();
    const locale = this.hass.locale as any;
    const config = this.hass.config as any;

    if (range === "month") {
      [this._startDate, this._endDate] = calcDateRange(locale, config, "this_month");
    } else if (range === "quarter") {
      [this._startDate, this._endDate] = calcDateRange(locale, config, "this_quarter");
    } else if (range === "year") {
      [this._startDate, this._endDate] = calcDateRange(locale, config, "this_year");
    } else if (range === "12month") {
      [this._startDate, this._endDate] = calcDateRange(locale, config, "now-12m");
    } else if (range === "months") {
      const difference = calcDateDifferenceProperty(
        this._endDate!,
        this._startDate,
        differenceInCalendarMonths,
        locale,
        config
      ) as number;
      this._startDate = calcDate(
        calcDate(today, startOfMonth, locale, config),
        subMonths,
        locale,
        config,
        difference
      );
      this._endDate = calcDate(today, endOfMonth, locale, config);
    } else {
      const weekStartsOn = firstWeekdayIndex(locale);
      const weekStart = calcDate(this._endDate!, startOfWeek, locale, config, { weekStartsOn });
      const weekEnd = calcDate(this._endDate!, endOfWeek, locale, config, { weekStartsOn });

      if (
        this._startDate.getTime() === weekStart.getTime() &&
        this._endDate!.getTime() === weekEnd.getTime()
      ) {
        [this._startDate, this._endDate] = calcDateRange(locale, config, "this_week");
      } else {
        const difference = calcDateDifferenceProperty(
          this._endDate!,
          this._startDate,
          differenceInDays,
          locale,
          config
        ) as number;
        this._startDate = calcDate(
          calcDate(today, subDays, locale, config, difference),
          startOfDay,
          locale,
          config,
          { weekStartsOn }
        );
        this._endDate = calcDate(today, endOfDay, locale, config, { weekStartsOn });
      }
    }

    this._updateCollectionPeriod();
  }

  private _pickPrevious() {
    this._shift(false);
  }

  private _pickNext() {
    this._shift(true);
  }

  private _shift(forward: boolean) {
    if (!this._startDate) return;
    const { start, end } = shiftDateRange(
      this._startDate,
      this._endDate!,
      forward,
      this.hass.locale as any,
      this.hass.config as any
    );
    this._startDate = start;
    this._endDate = end;
    this._updateCollectionPeriod();
  }

  private _updateDates(energyData: EnergyData): void {
    clearTimeout(this._loadingTimer);
    this._loading = false;
    this._compare = energyData.startCompare !== undefined;
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
  }

  private _handleDatepickerToggle(ev: CustomEvent<{ open: boolean }>) {
    this._datepickerOpen = ev.detail.open;
  }

  private _toggleCompare() {
    this._compare = !this._compare;
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setCompare(this._compare ? CompareMode.PREVIOUS : CompareMode.NONE);
    energyCollection.refresh();
    this._scheduleLoadingIndicator();
  }

  private _scheduleLoadingIndicator() {
    clearTimeout(this._loadingTimer);
    this._loadingTimer = setTimeout(() => {
      this._loading = true;
    }, 200);
  }

  private _getDatePickerPlacement = memoizeOne(
    (
      verticalOpeningDirection: VerticalOpeningDirection | undefined,
      openingDirection: OpeningDirection | undefined
    ): string => {
      const vertical = verticalOpeningDirection === "up" ? "top" : "bottom";
      if (openingDirection === "center" || openingDirection === "inline") {
        return vertical;
      }
      const horizontal = openingDirection === "left" ? "end" : "start";
      return `${vertical}-${horizontal}`;
    }
  );

  static styles = css`
    :host {
      display: block;
    }
    .row {
      justify-content: space-between;
      container-type: inline-size;
    }
    .content {
      display: flex;
      flex-direction: row;
      align-items: center;
      box-sizing: border-box;
    }
    .date-picker-icon {
      flex: none;
      min-width: var(--ha-space-2);
      height: 100%;
      display: flex;
      flex-direction: row;
    }
    .date-range {
      flex: 1;
      padding: 2px var(--ha-space-2) 2px 0px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: var(--ha-space-10);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      position: relative;
    }
    .header-title {
      font-size: var(--ha-font-size-xl);
      line-height: var(--ha-line-height-condensed);
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
    }
    .header-subtitle {
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-condensed);
      color: var(--secondary-text-color);
    }
    :host([narrow]) .header-title {
      font-size: var(--ha-font-size-m);
    }
    :host([narrow]) .header-subtitle {
      font-size: var(--ha-font-size-s);
    }
    .date-actions {
      flex: none;
      min-width: var(--ha-space-2);
      height: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .loading-indicator {
      display: flex;
      position: absolute;
      right: var(--ha-space-2);
      align-items: center;
      opacity: 0;
      transition: opacity var(--ha-animation-duration-normal) ease-in-out;
    }
    .loading-indicator.is-loading {
      opacity: 1;
    }
    .date-actions .overflow {
      display: flex;
      align-items: center;
    }
    ha-button {
      margin-left: var(--ha-space-2);
      margin-inline-start: var(--ha-space-2);
      margin-inline-end: initial;
      flex-shrink: 0;
      --ha-button-theme-color: currentColor;
    }
    ha-ripple {
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    :host([narrow]) ha-date-range-picker {
      --ha-icon-button-size: 24px;
      --mdc-icon-size: 16px;
    }
    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: var(--dialog-z-index, 8);
      -webkit-backdrop-filter: var(
        --ha-dialog-scrim-backdrop-filter,
        var(--dialog-backdrop-filter)
      );
      backdrop-filter: var(--ha-dialog-scrim-backdrop-filter, var(--dialog-backdrop-filter));
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--ha-animation-duration-slow) ease-in-out;
    }
    .datepicker-open .backdrop {
      opacity: 1;
      pointer-events: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus-inner": EnergyPeriodSelectorPlusInner;
  }
}
