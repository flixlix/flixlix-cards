import { mdiChevronDown } from "@mdi/js";
import { css, html, type TemplateResult } from "lit";
import { type HomeFlowView } from "./types";

export type ViewSelector = {
  views: readonly HomeFlowView[];
  selected: HomeFlowView;
  label: (view: HomeFlowView) => string;
  name: string;
  instant: boolean;
  compact: boolean;
  onSelect: (view: HomeFlowView, from: "pointer" | "keyboard") => void;
};

const dropdown = ({ views, selected, label, name, onSelect }: ViewSelector) => {
  const onChange = (event: Event) => {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : undefined;
    const view = views.find((candidate) => candidate === value);
    if (view !== undefined) {
      onSelect(view, "pointer");
    }
  };
  return html`<label class="views compact">
    <select aria-label=${name} @change=${onChange}>
      ${views.map(
        (view) => html`<option value=${view} ?selected=${view === selected}>${label(view)}</option>`
      )}
    </select>
    <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d=${mdiChevronDown}></path>
    </svg>
  </label>`;
};

export const overflows = (stage: Element, selector: Element) => {
  const bounds = stage.getBoundingClientRect();
  const box = selector.getBoundingClientRect();
  return (
    box.left < bounds.left ||
    [...stage.querySelectorAll(".label")].some((label) => {
      const other = label.getBoundingClientRect();
      return (
        other.left < box.right &&
        box.left < other.right &&
        other.top < box.bottom &&
        box.top < other.bottom
      );
    })
  );
};

const STEPS: Record<string, (index: number, count: number) => number> = {
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

export const viewSelector = (selector: ViewSelector): TemplateResult => {
  if (selector.compact) {
    return dropdown(selector);
  }
  const { views, selected, label, name, instant, onSelect } = selector;
  const index = views.indexOf(selected);
  const onKeydown = (event: KeyboardEvent) => {
    const step = STEPS[event.key];
    const next = step ? views[step(index, views.length)] : undefined;
    if (next !== undefined) {
      event.preventDefault();
      onSelect(next, "keyboard");
    }
  };
  return html`<div
    class="views ${instant ? "instant" : ""}"
    role="radiogroup"
    aria-label=${name}
    style=${`--view-count: ${views.length}; --view-index: ${index}`}
    @keydown=${onKeydown}
  >
    ${views.map(
      (view) =>
        html`<button
          type="button"
          role="radio"
          aria-checked=${view === selected ? "true" : "false"}
          tabindex=${view === selected ? 0 : -1}
          @click=${() => onSelect(view, "pointer")}
        >
          ${label(view)}
        </button>`
    )}
    <div class="view-indicator" aria-hidden="true">
      ${views.map((view) => html`<span>${label(view)}</span>`)}
    </div>
  </div>`;
};

export const viewSelectorStyles = css`
  .card-content.with-views {
    position: relative;
  }

  .views {
    --view-inset: 2px;
    position: absolute;
    top: calc(var(--label-unit, 1.26px) * 6);
    right: calc(var(--label-unit, 1.26px) * 6);
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    padding: var(--view-inset);
    border-radius: 999px;
    background: var(--house-view-track);
    font-size: calc(var(--label-unit, 1.26px) * 9.5);
    font-weight: 500;
    line-height: 1;
    transition: transform 160ms var(--house-ease-out);
  }

  .views:active {
    transform: scale(0.97);
  }

  .views:has(:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .views button,
  .view-indicator span {
    padding: 0.5em 1em;
    text-align: center;
    white-space: nowrap;
  }

  .views button {
    position: relative;
    margin: 0;
    border: 0;
    border-radius: 999px;
    background: none;
    font: inherit;
    color: var(--secondary-text-color);
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: color 150ms ease;
  }

  .views button::before {
    content: "";
    position: absolute;
    inset: 50% 0 auto;
    height: max(100%, 44px);
    transform: translateY(-50%);
  }

  @media (hover: hover) and (pointer: fine) {
    .views button:hover {
      color: var(--primary-text-color);
    }
  }

  .view-indicator {
    position: absolute;
    inset: var(--view-inset);
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border-radius: 999px;
    background: var(--house-view-indicator);
    color: var(--primary-text-color);
    pointer-events: none;
    clip-path: inset(
      0 calc((var(--view-count) - var(--view-index) - 1) / var(--view-count) * 100%) 0
        calc(var(--view-index) / var(--view-count) * 100%) round 999px
    );
    transition: clip-path 260ms var(--house-ease-in-out);
  }

  .views.instant .view-indicator {
    transition: none;
  }

  .views.compact {
    display: block;
    padding: 0;
  }

  .views.compact select {
    appearance: none;
    margin: 0;
    border: 0;
    border-radius: 999px;
    padding: 0.75em 2.4em 0.75em 1.2em;
    background: none;
    font: inherit;
    line-height: 1;
    color: var(--primary-text-color);
    cursor: pointer;
    outline: none;
  }

  .views.compact .chevron {
    position: absolute;
    top: 50%;
    right: 0.8em;
    width: 1.3em;
    height: 1.3em;
    transform: translateY(-50%);
    fill: var(--secondary-text-color);
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .views,
    .view-indicator {
      transition: none;
    }

    .views:active {
      transform: none;
    }
  }
`;
