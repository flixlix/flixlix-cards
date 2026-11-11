import { css, html, type TemplateResult } from "lit";
import { type HomeFlowView } from "./types";
import { type ViewSelector } from "./view-selector";

const isView = (views: readonly HomeFlowView[], value: unknown): value is HomeFlowView =>
  views.some((view) => view === value);

const pickedValue = (event: Event): unknown => {
  const detail: unknown = "detail" in event ? event.detail : undefined;
  return typeof detail === "object" &&
    detail !== null &&
    "item" in detail &&
    detail.item instanceof Element
    ? detail.item.getAttribute("value")
    : undefined;
};

export const viewDropdown = ({
  views,
  selected,
  label,
  name,
  onSelect,
}: ViewSelector): TemplateResult => {
  const onPick = (event: Event) => {
    const value = pickedValue(event);
    if (isView(views, value)) {
      onSelect(value, "pointer");
    }
  };
  return html`<ha-dropdown placement="bottom-end" @wa-select=${onPick}>
    <button slot="trigger" type="button" class="views view-trigger" aria-label=${name}>
      <span>${label(selected)}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 10l5 5 5-5" />
      </svg>
    </button>
    ${views.map(
      (view) =>
        html`<ha-dropdown-item value=${view} ?selected=${view === selected}>
          ${label(view)}
        </ha-dropdown-item>`
    )}
  </ha-dropdown>`;
};

export const viewDropdownStyles = css`
  .views.view-trigger {
    display: flex;
    align-items: center;
    gap: 0.35em;
    margin: 0;
    border: 0;
    padding: calc(0.5em + var(--view-inset)) 0.75em calc(0.5em + var(--view-inset)) 1em;
    font-family: inherit;
    color: var(--primary-text-color);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .views.view-trigger::before {
    content: "";
    position: absolute;
    inset: 50% 0 auto;
    height: max(100%, 44px);
    transform: translateY(-50%);
  }

  .views.view-trigger:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .view-trigger svg {
    width: 1.2em;
    height: 1.2em;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 200ms var(--house-ease-out);
  }

  .views.view-trigger[aria-expanded="true"] {
    background: color-mix(in srgb, var(--house-view-track), var(--primary-text-color) 8%);
  }

  .view-trigger[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  @media (hover: hover) and (pointer: fine) {
    .views.view-trigger:hover {
      background: color-mix(in srgb, var(--house-view-track), var(--primary-text-color) 8%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .view-trigger svg {
      transition: none;
    }
  }
`;
