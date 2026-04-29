import { ACTIONS_EXPANDABLE, NAME_ICON_GRID, POWER_ENTITY_SELECTOR } from "./_schema-shared";

export const homeSchema = [
  { name: "entity", label: "Entity (optional)", ...POWER_ENTITY_SELECTOR },
  {
    name: "override_state",
    label: "Override state with entity",
    default: false,
    selector: { boolean: {} },
  },
  NAME_ICON_GRID,
  { name: "color", label: "Color", selector: { ui_color: {} } },
  ACTIONS_EXPANDABLE,
] as const;
