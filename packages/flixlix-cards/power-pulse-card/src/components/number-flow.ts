import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Inline implementation of the number-flow effect (digits slide vertically
 * between values), avoiding a runtime dependency on the upstream library.
 */
@customElement("flixlix-number-flow")
export class FlixlixNumberFlow extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) decimals = 0;
  @property({ type: String }) locale: string | undefined;
  @property({ type: Number }) duration = 600;
  @property({ type: String }) easing = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  @property({ type: String }) unit = "";

  @state() private _parts: Intl.NumberFormatPart[] = [];

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("value") || changed.has("decimals") || changed.has("locale")) {
      this._parts = formatParts(this.value, this.decimals, this.locale);
    }
  }

  protected render() {
    const style = `--flixlix-number-flow-duration: ${this.duration}ms; --flixlix-number-flow-easing: ${this.easing};`;
    return html`
      <span class="root" style=${style}>
        ${this._parts.map((part) =>
          part.type === "integer" || part.type === "fraction"
            ? this._renderDigits(part.value)
            : html`<span class="static">${part.value}</span>`
        )}
        ${this.unit ? html`<span class="unit">${this.unit}</span>` : null}
      </span>
    `;
  }

  private _renderDigits(value: string) {
    return html`<span class="digits">${[...value].map((ch) => this._renderDigit(ch))}</span>`;
  }

  private _renderDigit(ch: string) {
    const numeric = Number(ch);
    if (!Number.isFinite(numeric) || ch < "0" || ch > "9") {
      return html`<span class="static">${ch}</span>`;
    }
    // The column is 10 cells tall (10em). translateY uses % relative to the
    // column's own height, so each digit step is 10% (= 1em).
    const offset = -numeric * 10;
    return html`
      <span class="digit">
        <span class="column" style="transform: translateY(${offset}%);">
          ${DIGITS.map((d) => html`<span class="cell">${d}</span>`)}
        </span>
      </span>
    `;
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: baseline;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .root {
      display: inline-flex;
      align-items: baseline;
    }

    .digits {
      display: inline-flex;
    }

    .digit {
      display: inline-block;
      overflow: hidden;
      height: 1em;
      vertical-align: baseline;
      width: 0.62em;
      text-align: center;
    }

    .column {
      display: flex;
      flex-direction: column;
      transition: transform var(--flixlix-number-flow-duration, 600ms)
        var(--flixlix-number-flow-easing, cubic-bezier(0.22, 0.61, 0.36, 1));
      will-change: transform;
    }

    .cell {
      height: 1em;
      line-height: 1em;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .static,
    .unit {
      display: inline-block;
    }

    .unit {
      margin-inline-start: 0.18em;
      opacity: 0.85;
    }
  `;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function formatParts(
  value: number,
  decimals: number,
  locale: string | undefined
): Intl.NumberFormatPart[] {
  try {
    const fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return fmt.formatToParts(Number.isFinite(value) ? value : 0);
  } catch {
    return [{ type: "integer", value: String(Math.round(value)) }];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flixlix-number-flow": FlixlixNumberFlow;
  }
}
