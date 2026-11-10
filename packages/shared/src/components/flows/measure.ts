import { type ReactiveController, type ReactiveControllerHost } from "lit";
import { type FlowLayout, type Point, type Ring } from "./geometry";

const round = (value: number) => Math.round(value * 100) / 100;

const center = (element: Element, origin: DOMRect): Point => {
  const box = element.getBoundingClientRect();
  return {
    x: round(box.left - origin.left + box.width / 2),
    y: round(box.top - origin.top + box.height / 2),
  };
};

const ringOf = (element: Element | null, origin: DOMRect): Ring | undefined => {
  if (!element) {
    return undefined;
  }
  const { x, y } = center(element, origin);
  return { cx: x, cy: y, r: round(element.getBoundingClientRect().width / 2) };
};

/** The middle row's slots: the grid unless the card has none, the hub and the home, each 80px wide. */
const middleRow = (middle: Element, origin: DOMRect, radius: number) => {
  const hubSlot = middle.querySelector(":scope > .hub");
  const homeSlot = hubSlot?.nextElementSibling;
  return {
    // Circles sit at the top of the middle row, their labels under them.
    axisY: round(middle.getBoundingClientRect().top - origin.top + radius),
    hubX: hubSlot ? center(hubSlot, origin).x : 0,
    homeX: homeSlot ? center(homeSlot, origin).x : origin.width - radius,
  };
};

/**
 * Where the node circles are inside the card content, in screen pixels relative to the content:
 * the overlay's own units, whatever transform (`full_size`, a scaled dialog) is applied.
 * `undefined` while the content has no size, e.g. in a hidden tab.
 */
export const measureFlowLayout = (content: HTMLElement): FlowLayout | undefined => {
  const origin = content.getBoundingClientRect();
  const middle = content.querySelector(".row.middle");
  if (origin.width === 0 || !middle) {
    return undefined;
  }
  const circle = (container: string) =>
    ringOf(content.querySelector(`.circle-container.${container} > .circle`), origin);
  const grid = circle("grid");
  const solar = circle("solar");
  const battery = circle("battery");
  const measuredHome = circle("home");
  const radius = (measuredHome ?? grid ?? solar ?? battery)?.r ?? 40;
  const slots = middleRow(middle, origin, radius);
  // A hidden home still receives the lines, at its empty slot.
  const home = measuredHome ?? { cx: slots.homeX, cy: grid?.cy ?? slots.axisY, r: radius };
  return {
    width: round(origin.width),
    height: round(origin.height),
    hub: { x: solar?.cx ?? battery?.cx ?? slots.hubX, y: home.cy },
    home,
    grid,
    solar,
    battery,
    rightTop: circle("individual-right-top"),
    rightBottom: circle("individual-right-bottom"),
    auxiliary: circle("auxiliary"),
  };
};

const sameLayout = (a: FlowLayout | undefined, b: FlowLayout | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Measures where the card's node circles landed after every render and renders again when they
 * moved, so the flow lines can be drawn to them.
 */
export class FlowLayoutController implements ReactiveController {
  private current?: FlowLayout;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly contentId: string
  ) {
    host.addController(this);
  }

  get layout(): FlowLayout | undefined {
    return this.current;
  }

  hostUpdated(): void {
    const content = this.host.shadowRoot?.getElementById(this.contentId);
    const next = content ? measureFlowLayout(content) : undefined;
    if (next && !sameLayout(next, this.current)) {
      this.current = next;
      this.host.requestUpdate();
    }
  }
}
