import * as mdi from "@mdi/js";
import { css, html, LitElement, nothing, svg } from "lit";
import { property } from "lit/decorators.js";
import { haThemeDark, haThemeLight } from "./ha-theme";

// ponytail: the full @mdi/js namespace (~3 MB) is bundled; load this module lazily, as the docs do.
const mdiPaths: Record<string, string> = mdi;

/** `mdi:solar-power` → the `mdiSolarPower` path from @mdi/js. */
const mdiPath = (icon: string | undefined): string | undefined => {
  const [prefix, name] = icon?.split(":") ?? [];
  if (prefix !== "mdi" || !name) {
    return undefined;
  }
  const pascal = name.replace(/(^|-)([a-z0-9])/g, (_, _dash, char: string) => char.toUpperCase());
  return mdiPaths[`mdi${pascal}`];
};

// Styles of the elements below are copied from the Home Assistant frontend (Apache-2.0),
// as served by Home Assistant 2026.11.

class HaCard extends LitElement {
  @property() header?: string;

  @property({ type: Boolean, reflect: true }) raised = false;

  render() {
    return html`${this.header ? html`<h1 class="card-header">${this.header}</h1>` : nothing}<slot
      ></slot>`;
  }

  static styles = css`
    :host {
      background: var(--ha-card-background, var(--card-background-color, white));
      backdrop-filter: var(--ha-card-backdrop-filter, none);
      box-shadow: var(--ha-card-box-shadow, none);
      box-sizing: border-box;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border-width: var(--ha-card-border-width, 1px);
      border-style: solid;
      border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      color: var(--primary-text-color);
      transition: all 0.3s ease-out;
      position: relative;
      display: block;
    }
    :host([raised]) {
      border: none;
      box-shadow: var(
        --ha-card-box-shadow,
        0px 2px 1px -1px rgba(0, 0, 0, 0.2),
        0px 1px 1px 0px rgba(0, 0, 0, 0.14),
        0px 1px 3px 0px rgba(0, 0, 0, 0.12)
      );
    }
    .card-header,
    :host ::slotted(.card-header) {
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      letter-spacing: -0.012em;
      line-height: var(--ha-line-height-condensed);
      padding: var(--ha-space-5) var(--ha-space-4) var(--ha-space-6);
      display: block;
      margin-block: 0;
      font-weight: var(--ha-font-weight-normal);
    }
    :host ::slotted(.card-content:not(:nth-child(1 of .card-content, .card-header))),
    slot:not(:first-child)::slotted(.card-content) {
      padding-top: 0;
      margin-top: calc(var(--ha-space-2) * -1);
    }
    :host ::slotted(.card-content) {
      padding: var(--ha-space-4);
    }
    :host ::slotted(.card-actions) {
      border-top: 1px solid var(--divider-color, #e8e8e8);
      padding: var(--ha-space-2);
    }
  `;
}

class HaSvgIcon extends LitElement {
  @property() path?: string;

  render() {
    return html`<svg
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      role="img"
      aria-hidden="true"
    >
      <g>${this.path ? svg`<path class="primary-path" d=${this.path}></path>` : nothing}</g>
    </svg>`;
  }

  static styles = css`
    :host {
      display: var(--ha-icon-display, inline-flex);
      align-items: center;
      justify-content: center;
      position: relative;
      vertical-align: middle;
      fill: var(--icon-primary-color, currentcolor);
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
    }
    svg {
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: block;
    }
    path.primary-path {
      opacity: var(--icon-primary-opactity, 1);
    }
  `;
}

class HaIcon extends LitElement {
  @property() icon?: string;

  render() {
    return html`<ha-svg-icon .path=${mdiPath(this.icon)}></ha-svg-icon>`;
  }

  static styles = css`
    :host {
      fill: currentcolor;
    }
  `;
}

class HaIconButton extends LitElement {
  @property({ type: Boolean }) disabled = false;
  @property() label?: string;

  render() {
    return html`<button ?disabled=${this.disabled} aria-label=${this.label ?? nothing}>
      <slot></slot>
    </button>`;
  }
}

class HaButton extends LitElement {
  @property() href?: string;

  render() {
    return html`<a href=${this.href ?? nothing}><slot></slot></a>`;
  }
}

class HaRipple extends LitElement {
  @property({ type: Boolean }) disabled = false;
}

const elements: [tag: string, element: CustomElementConstructor][] = [
  ["ha-card", HaCard],
  ["ha-svg-icon", HaSvgIcon],
  ["ha-icon", HaIcon],
  ["ha-icon-button", HaIconButton],
  ["ha-button", HaButton],
  ["ha-ripple", HaRipple],
];

/**
 * The Home Assistant frontend elements the cards render: `ha-card` and the icons look as in
 * Home Assistant; buttons and the ripple are bare stand-ins.
 */
export const defineHaElements = (): void => {
  for (const [tag, element] of elements) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
};

/**
 * Inline style for the element a card is mounted in: Home Assistant's default theme and the text
 * styles a dashboard passes down to its cards.
 */
export const haDashboardStyle = (scheme: "light" | "dark" = "light"): string =>
  `${haThemeLight}${scheme === "dark" ? haThemeDark : ""}
  font-family: var(--ha-font-family-body);
  font-size: var(--ha-font-size-m);
  line-height: var(--ha-line-height-normal);
  font-weight: var(--ha-font-weight-normal);
  -webkit-font-smoothing: var(--ha-font-smoothing);
  -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
  color: var(--primary-text-color);
  background: var(--primary-background-color);`;
