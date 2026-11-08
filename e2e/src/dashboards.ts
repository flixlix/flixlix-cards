/** YAML dashboards of `.hass_dev/lovelace.yaml`, one per card. */
export const CARD_DASHBOARDS = {
  "power-flow-card-plus": "power-flow",
  "power-flow-house-card": "power-flow-house",
  "energy-flow-card-plus": "energy-flow",
  "energy-breakdown-card": "energy-breakdown",
  "sortable-list-card": "sortable-list",
} as const;

export type CardType = keyof typeof CARD_DASHBOARDS;

/** Storage dashboard created by the bootstrap; the editor tests overwrite its config. */
export const EDITOR_DASHBOARD = "card-editors";

/**
 * Storage dashboard the bootstrap seeds once with a Power Flow House Card, for trying its visual
 * editor by hand; no test touches it.
 */
export const HOUSE_EDITOR_DASHBOARD = "power-flow-house-editor";
