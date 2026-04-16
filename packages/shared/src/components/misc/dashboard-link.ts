import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing } from "lit";

export const dashboardLinkElement = (config: FlowCardPlusConfig, hass: HomeAssistant) => {
  if (!config.dashboard_link && !config.second_dashboard_link) return nothing;

  return html`
    <div class="card-actions">
      ${config.dashboard_link
        ? html`
            <ha-button appearance="plain" size="small" href=${config.dashboard_link}>
              ${config.dashboard_link_label ||
              hass.localize(
                "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard"
              )}
            </ha-button>
          `
        : nothing}
      ${config.second_dashboard_link
        ? html`
            <ha-button appearance="plain" size="small" href=${config.second_dashboard_link}>
              ${config.second_dashboard_link_label ||
              hass.localize(
                "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard"
              )}
            </ha-button>
          `
        : nothing}
    </div>
  `;
};
