import { type ReactiveController, type ReactiveElement } from "lit";

/**
 * An element's laid-out width: border box for HTML, the viewport for an `<svg>`. Not its box on
 * screen, which a dashboard animating in with a transform would shrink.
 */
const layoutWidth = (element: Element) =>
  element instanceof HTMLElement ? element.offsetWidth : element.clientWidth;

/**
 * The width of an element in a card's shadow root, kept current while the card is connected; the
 * card updates when it changes. Home Assistant takes cards out and puts them back while a
 * dashboard loads, so the watch is dropped on disconnect and taken up again on reconnect: a card
 * watching only from its own `updated` would keep the width it had while it was out, 0.
 */
export class WidthController implements ReactiveController {
  public width = 0;
  private _observer?: ResizeObserver;
  private _observed?: Element;

  constructor(
    private readonly _host: ReactiveElement,
    private readonly _selector: string
  ) {
    _host.addController(this);
  }

  hostConnected(): void {
    if (this._host.hasUpdated) {
      this._observe();
    }
  }

  hostUpdated(): void {
    this._observe();
  }

  hostDisconnected(): void {
    this._observer?.disconnect();
    this._observed = undefined;
  }

  private _observe() {
    const element = this._host.renderRoot.querySelector(this._selector);
    if (!element || element === this._observed) {
      return;
    }
    this._observed = element;
    this._observer?.disconnect();
    this._observer ??= new ResizeObserver(([entry]) => {
      if (entry) {
        this._set(layoutWidth(entry.target));
      }
    });
    this._observer.observe(element);
    this._set(layoutWidth(element));
  }

  private _set(width: number) {
    if (width !== this.width) {
      this.width = width;
      this._host.requestUpdate();
    }
  }
}
