/** YAML dashboards of `.hass_dev/lovelace.yaml`, one per card. */
export const CARD_DASHBOARDS = {
  "power-flow-card-plus": "power-flow",
  "energy-flow-card-plus": "energy-flow",
  "energy-breakdown-card": "energy-breakdown",
  "sortable-list-card": "sortable-list",
} as const;

export type CardType = keyof typeof CARD_DASHBOARDS;

/** Storage dashboard created by the bootstrap; the editor tests overwrite its config. */
export const EDITOR_DASHBOARD = "card-editors";
