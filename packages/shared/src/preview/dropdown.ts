import { mdiCheck } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { property, query } from "lit/decorators.js";

/**
 * Stands in for Home Assistant's `ha-dropdown` in the docs: the `trigger` slot opens the items in
 * a popover, and picking one fires `wa-select` with `{ item }`, as HA's (Web Awesome's) does. The
 * popover sits in the top layer, so no clipping container hides it. `placement` is honoured for
 * `bottom-start` and `bottom-end` only.
 */
class Dropdown extends LitElement {
  @property() placement = "bottom-start";
  @query("[popover]") private menu?: HTMLElement;

  private toggle = (event: Event) => {
    const menu = this.menu;
    const trigger = event.currentTarget instanceof HTMLSlotElement && event.currentTarget;
    const anchor = trigger && trigger.assignedElements()[0];
    if (!menu || !anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${String(rect.bottom + 4)}px`;
    if (this.placement === "bottom-end") {
      menu.style.left = "auto";
      menu.style.right = `${String(document.documentElement.clientWidth - rect.right)}px`;
    } else {
      menu.style.left = `${String(rect.left)}px`;
      menu.style.right = "auto";
    }
    menu.togglePopover();
  };

  private pick = (event: Event) => {
    const item = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && node.localName === "ha-dropdown-item");
    if (!item) {
      return;
    }
    this.menu?.hidePopover();
    this.dispatchEvent(new CustomEvent("wa-select", { detail: { item } }));
  };

  // ponytail: a fixed popover stays put while the page scrolls; it closes on the next click.
  private close = () => this.menu?.hidePopover();

  connectedCallback() {
    super.connectedCallback();
    addEventListener("scroll", this.close, { passive: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    removeEventListener("scroll", this.close);
  }

  render() {
    return html`<slot name="trigger" @click=${this.toggle}></slot>
      <div popover role="menu" @click=${this.pick}><slot></slot></div>`;
  }

  static styles = css`
    :host {
      display: inline-block;
    }
    [popover] {
      position: fixed;
      inset: auto;
      margin: 0;
      min-width: 160px;
      padding: 4px 0;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      font: inherit;
    }
  `;
}

/** An item of the stand-in dropdown; `checkbox` items show a check while `checked`. */
class DropdownItem extends LitElement {
  @property() value?: string;
  @property() type?: string;
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) checked = false;

  connectedCallback() {
    super.connectedCallback();
    this.tabIndex = 0;
  }

  updated() {
    const checkbox = this.type === "checkbox";
    this.setAttribute("role", checkbox ? "menuitemcheckbox" : "menuitem");
    if (checkbox) {
      this.setAttribute("aria-checked", String(this.checked));
    }
  }

  render() {
    return html`<span class="check">
        ${
          this.type === "checkbox" && this.checked
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : nothing
        }
      </span>
      <slot></slot>`;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px 8px 8px;
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    :host(:hover),
    :host(:focus-visible) {
      background: var(--secondary-background-color);
      outline: none;
    }
    :host([selected]) {
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }
    .check {
      display: flex;
      width: 18px;
    }
  `;
}

class Divider extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin: 4px 0;
      border-top: 1px solid var(--divider-color);
    }
  `;
}

const elements: [tag: string, element: CustomElementConstructor][] = [
  ["ha-dropdown", Dropdown],
  ["ha-dropdown-item", DropdownItem],
  ["wa-divider", Divider],
];

/** Defines the stand-in dropdown for the docs; HA's own wins where loaded. */
export const defineDropdown = (): void => {
  for (const [tag, element] of elements) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
};
