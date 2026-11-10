import {
  type ActionConfigSet,
  type CardButton,
  type CardMainContext,
  type FlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing } from "lit";

const dashboardLink = (hass: HomeAssistant, href: string | undefined, label: string | undefined) =>
  href
    ? html`
        <ha-button appearance="plain" size="small" href=${href}>
          ${
            nonEmpty(label) ??
            hass.localize(
              "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard"
            )
          }
        </ha-button>
      `
    : nothing;

/** Like a Home Assistant button card: without any action, a tap opens the entity's more-info. */
const buttonActions = ({ tap_action, hold_action, double_tap_action, entity }: CardButton) =>
  tap_action || hold_action || double_tap_action
    ? { tap_action, hold_action, double_tap_action }
    : ({ tap_action: { action: entity ? "more-info" : "none" } } satisfies ActionConfigSet);

const buttonLabel = (hass: HomeAssistant, button: CardButton) => {
  const entityName = button.entity
    ? hass.states[button.entity]?.attributes.friendly_name
    : undefined;
  return nonEmpty(button.name) ?? nonEmpty(entityName) ?? button.entity;
};

const cardButton = (main: CardMainContext, hass: HomeAssistant, button: CardButton) => {
  const actions = buttonActions(button);
  const label = buttonLabel(hass, button);
  return html`
    <ha-button
      appearance="plain"
      size="small"
      class="card-button"
      aria-label=${label ?? nothing}
      @click=${(e: MouseEvent) => main.onEntityClick(e, actions, button.entity)}
      @dblclick=${(e: MouseEvent) => main.onEntityDoubleClick(e, actions, button.entity)}
      @pointerdown=${(e: PointerEvent) => main.onEntityPointerDown(e, actions, button.entity)}
      @pointerup=${(e: PointerEvent) => main.onEntityPointerUp(e)}
      @pointercancel=${(e: PointerEvent) => main.onEntityPointerUp(e)}
    >
      ${button.icon ? html`<ha-icon slot="start" .icon=${button.icon}></ha-icon>` : nothing}
      ${nonEmpty(button.name) ?? (button.icon ? nothing : label)}
    </ha-button>
  `;
};

/** The row under the nodes: the dashboard links, then the configured buttons. */
export const cardButtonsElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  hass: HomeAssistant
) => {
  const buttons = config.buttons ?? [];
  if (!config.dashboard_link && !config.second_dashboard_link && buttons.length === 0) {
    return nothing;
  }

  return html`
    <div class="card-actions">
      ${dashboardLink(hass, config.dashboard_link, config.dashboard_link_label)}
      ${dashboardLink(hass, config.second_dashboard_link, config.second_dashboard_link_label)}
      ${buttons.map((button) => cardButton(main, hass, button))}
    </div>
  `;
};
