import * as mdi from "@mdi/js";
import { css, html, LitElement, nothing, svg } from "lit";
import { property } from "lit/decorators.js";

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

class StubCard extends LitElement {
  @property() header?: string;

  render() {
    return html`${this.header ? html`<h1 class="card-header">${this.header}</h1>` : nothing}<slot
      ></slot>`;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
      color: var(--primary-text-color, #212121);
    }
    .card-header {
      margin: 0;
      padding: 12px 16px 0;
      font-size: 24px;
      font-weight: 400;
    }
  `;
}

class StubIcon extends LitElement {
  @property() icon?: string;

  render() {
    const path = mdiPath(this.icon);
    return html`<svg viewBox="0 0 24 24">${path ? svg`<path d=${path}></path>` : nothing}</svg>`;
  }

  static styles = css`
    :host {
      fill: currentColor;
    }
    svg {
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
      vertical-align: middle;
    }
  `;
}

class StubIconButton extends LitElement {
  @property({ type: Boolean }) disabled = false;
  @property() label?: string;

  render() {
    return html`<button ?disabled=${this.disabled} aria-label=${this.label ?? nothing}>
      <slot></slot>
    </button>`;
  }
}

class StubButton extends LitElement {
  @property() href?: string;

  render() {
    return html`<a href=${this.href ?? nothing}><slot></slot></a>`;
  }
}

class StubRipple extends LitElement {
  @property({ type: Boolean }) disabled = false;
}

const stubs: [tag: string, element: CustomElementConstructor][] = [
  ["ha-card", StubCard],
  ["ha-icon", StubIcon],
  ["ha-icon-button", StubIconButton],
  ["ha-button", StubButton],
  ["ha-ripple", StubRipple],
];

/** Minimal stand-ins for the Home Assistant frontend elements the cards render. */
export const defineHaElements = (): void => {
  for (const [tag, element] of stubs) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
};
