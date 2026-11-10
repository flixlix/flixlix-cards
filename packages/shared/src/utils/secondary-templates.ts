import {
  type RenderTemplateResult,
  subscribeRenderTemplate,
} from "@flixlix-cards/shared/ha/template/ha-websocket";
import { type FlowCardPlusConfig, type TemplatesObj } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type UnsubscribeFunc } from "home-assistant-js-websocket";
import { type ReactiveController, type ReactiveElement } from "lit";

const individualTopic = (index: number) => `individual${index}Secondary`;

const configuredTemplates = (config: FlowCardPlusConfig): [topic: string, template: string][] => {
  const { entities } = config;
  const templates: [string, string | undefined][] = [
    ["gridSecondary", entities.grid?.secondary_info?.template],
    ["solarSecondary", entities.solar?.secondary_info?.template],
    ["homeSecondary", entities.home?.secondary_info?.template],
    ["nonFossilFuelSecondary", entities.fossil_fuel_percentage?.secondary_info?.template],
    ["auxiliarySecondary", entities.auxiliary?.secondary_info?.template],
    ...(entities.individual ?? []).map((individual, index): [string, string | undefined] => [
      individualTopic(index),
      individual.secondary_info?.template,
    ]),
  ];
  return templates.flatMap(([topic, template]) => (template ? [[topic, template]] : []));
};

/** Keeps the secondary-info templates of a card subscribed while it is connected. */
export class SecondaryTemplates implements ReactiveController {
  private _results: Partial<Record<string, RenderTemplateResult>> = {};
  private readonly _subscriptions = new Map<string, Promise<UnsubscribeFunc>>();

  constructor(
    private readonly _host: ReactiveElement,
    private readonly _context: () => { hass?: HomeAssistant; config?: FlowCardPlusConfig }
  ) {
    _host.addController(this);
  }

  public templates(config: FlowCardPlusConfig): TemplatesObj {
    const result = (topic: string) => this._results[topic]?.result;
    return {
      gridSecondary: result("gridSecondary"),
      solarSecondary: result("solarSecondary"),
      homeSecondary: result("homeSecondary"),
      nonFossilFuelSecondary: result("nonFossilFuelSecondary"),
      auxiliarySecondary: result("auxiliarySecondary"),
      individual: (config.entities.individual ?? []).map((_, index) =>
        result(individualTopic(index))
      ),
    };
  }

  public hostConnected(): void {
    this._connectAll();
  }

  public hostUpdated(): void {
    this._connectAll();
  }

  public hostDisconnected(): void {
    for (const topic of this._subscriptions.keys()) {
      void this._disconnect(topic);
    }
  }

  private _setResult(topic: string, result: RenderTemplateResult) {
    const previous = this._results;
    this._results = { ...previous, [topic]: result };
    // Named, so a host that skips updates for an unrelated `hass` still sees the new result.
    this._host.requestUpdate("secondaryTemplates", previous, { hasChanged: () => true });
  }

  private _connectAll() {
    const { hass, config } = this._context();
    if (!this._host.isConnected || !hass || !config) {
      return;
    }
    for (const [topic, template] of configuredTemplates(config)) {
      if (!this._subscriptions.has(topic)) {
        void this._connect(hass, config, template, topic);
      }
    }
  }

  private async _connect(
    hass: HomeAssistant,
    config: FlowCardPlusConfig,
    template: string,
    topic: string
  ): Promise<void> {
    try {
      const configEntityIds = config.entity_id;
      const entityIds =
        typeof configEntityIds === "string" ||
        (Array.isArray(configEntityIds) &&
          configEntityIds.every((entityId) => typeof entityId === "string"))
          ? configEntityIds
          : undefined;
      const subscription = subscribeRenderTemplate(
        hass.connection,
        (result) => this._setResult(topic, result),
        {
          template,
          entity_ids: entityIds,
          variables: { config, user: hass.user.name },
          strict: true,
        }
      );
      this._subscriptions.set(topic, subscription);
      await subscription;
    } catch {
      this._setResult(topic, {
        result: template,
        listeners: { all: false, domains: [], entities: [], time: false },
      });
      this._subscriptions.delete(topic);
    }
  }

  private async _disconnect(topic: string): Promise<void> {
    const subscription = this._subscriptions.get(topic);
    if (!subscription) {
      return;
    }
    try {
      const unsubscribe = await subscription;
      unsubscribe();
      this._subscriptions.delete(topic);
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
      // The connection was probably already closed.
      if (code !== "not_found" && code !== "template_error") {
        throw err;
      }
    }
  }
}
