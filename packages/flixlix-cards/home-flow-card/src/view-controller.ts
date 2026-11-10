import { translate } from "@flixlix-cards/shared/i18n";
import { type EnergyPeriodKey } from "@flixlix-cards/shared/states/utils/energy-period";
import { nothing, type ReactiveController, type ReactiveElement, type TemplateResult } from "lit";
import { type FlowConfig, type HomeFlowView, type HomeFlowViews } from "./types";
import { viewSelector } from "./view-selector";

export class ViewController implements ReactiveController {
  public views: HomeFlowViews | null = null;
  public view: HomeFlowView = "live";
  public period?: EnergyPeriodKey;
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

  get configs(): FlowConfig[] {
    return this.views ? [this.views.live, this.views.period] : [];
  }

  configure(views: HomeFlowViews | null): void {
    const reconfigured = this.views !== null;
    this.views = views;
    if (!views) {
      this.view = "live";
      this.period = undefined;
      return;
    }
    const { initial, periods } = views;
    const offered = this.view === "live" || periods.includes(this.view);
    this.view = reconfigured && offered ? this.view : initial;
    const period = this.period && periods.includes(this.period) ? this.period : periods[0];
    this.period = this.view === "live" ? period : this.view;
  }

  render(language: string): TemplateResult | typeof nothing {
    if (!this.views) {
      return nothing;
    }
    return viewSelector({
      views: ["live", ...this.views.periods],
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
    if (view !== "live") {
      this.period = view;
    }
    const config = this.config;
    if (config) {
      this._onSelect(config);
    }
    this._host.requestUpdate();
  };
}
