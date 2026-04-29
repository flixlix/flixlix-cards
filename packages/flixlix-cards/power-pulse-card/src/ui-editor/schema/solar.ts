import { ACTIONS_EXPANDABLE, NAME_ICON_GRID, POWER_ENTITY_SELECTOR } from "./_schema-shared";

export const solarSchema = [
  { name: "entity", label: "Entity", ...POWER_ENTITY_SELECTOR },
  NAME_ICON_GRID,
  { name: "color", label: "Color", selector: { ui_color: {} } },
  ACTIONS_EXPANDABLE,
] as const;
