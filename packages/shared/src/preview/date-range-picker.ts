import { mdiCalendar } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";

const toInput = (date: Date | undefined) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

/** `2026-11-08` → that day at local midnight; `undefined` for an empty or partial input. */
const fromInput = (value: string): Date | undefined => {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
};

/**
 * Stands in for Home Assistant's `ha-date-range-picker` in the docs: the same calendar icon button
 * (`minimal`), `open()`, and a `value-changed` event with `{ startDate, endDate }`. It picks the
 * range with the browser's date inputs in a modal dialog instead of HA's calendar; the dialog
 * opens in the top layer, so no clipping container hides it. The tests leave it undefined, as
 * on a dashboard before HA loads its picker.
 */
class DateRangePicker extends LitElement {
  @property({ attribute: false }) startDate?: Date;
  @property({ attribute: false }) endDate?: Date;
  @property({ type: Boolean }) minimal = false;
  @state() private start = "";
  @state() private end = "";
  @query("dialog") private dialog?: HTMLDialogElement;

  open() {
    this.start = toInput(this.startDate);
    this.end = toInput(this.endDate);
    this.dialog?.showModal();
  }

  private close = () => {
    this.dialog?.close();
  };

  /** A click on the backdrop lands on the dialog itself; inside it lands on its content. */
  private closeOnBackdrop = (event: MouseEvent) => {
    if (event.target === this.dialog) {
      this.close();
    }
  };

  private apply = () => {
    const startDate = fromInput(this.start);
    const endDate = fromInput(this.end);
    if (!startDate || !endDate || endDate < startDate) {
      return;
    }
    this.close();
    this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { startDate, endDate } } })
    );
  };

  render() {
    return html`<button class="icon" aria-label="Select a date range" @click=${() => this.open()}>
        <ha-svg-icon .path=${mdiCalendar}></ha-svg-icon>
      </button>
      <dialog aria-label="Date range" @click=${this.closeOnBackdrop}>
        <div class="content">
          <label
            >Start
            <input
              type="date"
              .value=${this.start}
              @input=${(event: Event) => {
                this.start = event.target instanceof HTMLInputElement ? event.target.value : "";
              }}
          /></label>
          <label
            >End
            <input
              type="date"
              .value=${this.end}
              min=${this.start || nothing}
              @input=${(event: Event) => {
                this.end = event.target instanceof HTMLInputElement ? event.target.value : "";
              }}
          /></label>
          <div class="actions">
            <button @click=${this.close}>Cancel</button>
            <button class="primary" @click=${this.apply}>Select</button>
          </div>
        </div>
      </dialog>`;
  }

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }
    button {
      font: inherit;
      color: var(--primary-text-color);
      background: none;
      border: none;
      cursor: pointer;
    }
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--ha-icon-button-size, 48px);
      height: var(--ha-icon-button-size, 48px);
      border-radius: 50%;
      --mdc-icon-size: 22px;
    }
    .icon:hover {
      background: var(--secondary-background-color);
    }
    dialog {
      padding: 0;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    }
    dialog::backdrop {
      background: rgba(0, 0, 0, 0.32);
    }
    .content {
      display: grid;
      gap: 12px;
      width: min(260px, calc(100vw - 64px));
      padding: 16px;
    }
    label {
      display: grid;
      gap: 4px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    input {
      font: inherit;
      font-size: 14px;
      padding: 6px 8px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color-scheme: light dark;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .actions button {
      padding: 6px 12px;
      border-radius: 18px;
    }
    .actions .primary {
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
    }
  `;
}

/** Defines the stand-in `ha-date-range-picker` for the docs; HA's own picker wins where loaded. */
export const defineDateRangePicker = (): void => {
  if (!customElements.get("ha-date-range-picker")) {
    customElements.define("ha-date-range-picker", DateRangePicker);
  }
};
