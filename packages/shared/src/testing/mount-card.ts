import { type HomeAssistant } from "custom-card-helpers";
import { type ReactiveController } from "lit";
import { defineHaElements } from "./ha-elements";

type CardElement = HTMLElement & {
  hass?: HomeAssistant;
  setConfig(config: object): void;
  updateComplete: Promise<boolean>;
  addController(controller: ReactiveController): void;
};

const frozenMotion = new CSSStyleSheet();
frozenMotion.replaceSync(`*, *::before, *::after {
  animation: none !important;
  transition: none !important;
}`);

/** Stops CSS motion and parks every SVG dot at the start of its path. */
const freezeMotion = (root: ShadowRoot) => {
  if (!root.adoptedStyleSheets.includes(frozenMotion)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, frozenMotion];
  }
  root.querySelectorAll("svg").forEach((svg) => {
    svg.pauseAnimations();
    svg.setCurrentTime(0);
  });
};

/** Home Assistant's default light theme, as far as the cards read it. */
const theme = `
  --primary-text-color: #212121;
  --secondary-text-color: #727272;
  --disabled-text-color: #bdbdbd;
  --primary-color: #03a9f4;
  --card-background-color: #fff;
  --secondary-background-color: #e5e5e5;
  --divider-color: rgba(0, 0, 0, 0.12);
  --energy-grid-consumption-color: #488fc2;
  --energy-grid-return-color: #8353d1;
  --energy-solar-color: #ff9800;
  --energy-non-fossil-color: #0f9d58;
  --energy-battery-out-color: #4db6ac;
  --energy-battery-in-color: #f06292;
`;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Lets the card finish every update its first render triggers: the width measured by its
 * ResizeObserver, template subscriptions and energy statistics resolving.
 */
const settle = async (card: CardElement, frames = 5): Promise<void> => {
  if (frames === 0) {
    if (card.shadowRoot) {
      freezeMotion(card.shadowRoot);
    }
    return;
  }
  await nextFrame();
  await card.updateComplete;
  return settle(card, frames - 1);
};

const textOf = (node: Node | null | undefined) => node?.textContent?.replace(/\s+/g, " ").trim();

export type MountedCard = {
  card: CardElement;
  root: ShadowRoot;
  /** Whitespace-collapsed text of the first element matching the selector. */
  text: (selector: string) => string | undefined;
  /** Markup of the card, including the inline style the card sets on itself. */
  markup: () => string;
  setHass: (hass: HomeAssistant) => Promise<void>;
  resize: (width: number) => Promise<void>;
  settle: () => Promise<void>;
  /** Lit updates (state computed and rendered) the card ran since it was mounted and settled. */
  updates: () => number;
};

let mounted: HTMLElement | undefined;

/** Mounts a card in a container of the given width, replacing the previously mounted one. */
export const mountCard = async (
  Card: new () => CardElement,
  config: object,
  hass: HomeAssistant,
  { width = 500 }: { width?: number } = {}
): Promise<MountedCard> => {
  defineHaElements();
  mounted?.remove();
  const container = document.createElement("div");
  container.style.cssText = `${theme} width: ${width}px; padding: 8px; font-family: sans-serif;`;
  const card = new Card();
  card.setConfig(config);
  card.hass = hass;
  container.append(card);
  document.body.append(container);
  mounted = container;
  await settle(card);
  const root = card.shadowRoot;
  if (!root) {
    throw new Error(`mountCard: <${card.localName}> rendered no shadow root`);
  }
  let updates = 0;
  card.addController({
    hostUpdated: () => {
      updates += 1;
    },
  });
  return {
    card,
    root,
    text: (selector) => textOf(root.querySelector(selector)),
    markup: () => `${card.getAttribute("style") ?? ""}${root.innerHTML}`,
    setHass: async (next) => {
      card.hass = next;
      await settle(card);
    },
    resize: async (next) => {
      container.style.width = `${next}px`;
      await settle(card);
    },
    settle: () => settle(card),
    updates: () => updates,
  };
};
