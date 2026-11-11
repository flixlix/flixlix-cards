import { translate } from "@flixlix-cards/shared/i18n";
import { type EnergyPeriodKey } from "@flixlix-cards/shared/states/utils/energy-period";
import { nothing, type ReactiveController, type ReactiveElement, type TemplateResult } from "lit";
import { type FlowConfig, type HomeFlowView, type HomeFlowViews } from "./types";
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

  get period(): EnergyPeriodKey | undefined {
    const views = this.views?.views ?? [];
    return [this.view, ...views].find((view): view is EnergyPeriodKey => view !== "live");
  }

  configure(views: HomeFlowViews | null): void {
    const kept = this.views !== null && views?.views.includes(this.view);
    this.views = views;
    this.view = kept ? this.view : (views?.initial ?? "live");
  }

  render(language: string): TemplateResult | typeof nothing {
    if (!this.views || this.views.views.length < 2) {
      return nothing;
    }
    return viewSelector({
      views: this.views.views,
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
