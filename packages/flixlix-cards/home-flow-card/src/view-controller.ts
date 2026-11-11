import { translate } from "@flixlix-cards/shared/i18n";
import { nothing, type ReactiveController, type ReactiveElement, type TemplateResult } from "lit";
import { type FlowConfig, type HomeFlowView, type HomeFlowViews, VIEWS } from "./types";
import { viewSelector } from "./view-selector";

export class ViewController implements ReactiveController {
  public views: HomeFlowViews | null = null;
  public view: HomeFlowView = "live";
  private _instant = false;
  private _focus = false;

  constructor(
    private readonly _host: ReactiveElement,
    private readonly _onSelect: (config: FlowConfig) => void
  ) {
    _host.addController(this);
  }

  get config(): FlowConfig | undefined {
    return this.view === "live" ? this.views?.live : this.views?.period;
  }

  get period() {
    return this.views ? ("today" as const) : undefined;
  }

  configure(views: HomeFlowViews | null): void {
    const reconfigured = this.views !== null;
    this.views = views;
    this.view = views && reconfigured ? this.view : (views?.initial ?? "live");
  }

  render(language: string): TemplateResult | typeof nothing {
    if (!this.views) {
      return nothing;
    }
    return viewSelector({
      views: VIEWS,
      selected: this.view,
      label: (view) => translate(`card.view.${view}`, language),
      name: translate("card.view.name", language),
      instant: this._instant,
      onSelect: this._select,
    });
  }

  hostUpdated(): void {
    if (this._focus) {
      this._focus = false;
      this._host.shadowRoot?.querySelector<HTMLElement>('.views [aria-checked="true"]')?.focus();
    }
  }

  private _select = (view: HomeFlowView, from: "pointer" | "keyboard") => {
    this._instant = from === "keyboard";
    this._focus = from === "keyboard";
    this.view = view;
    const config = this.config;
    if (config) {
      this._onSelect(config);
    }
    this._host.requestUpdate();
  };
}
