const POWER_DOMAINS = ["sensor", "input_number", "number"] as const;

export const POWER_ENTITY_SELECTOR = {
  selector: {
    entity: { include_domains: POWER_DOMAINS, device_class: "power" },
  },
} as const;

export const NAME_ICON_GRID = {
  type: "grid" as const,
  name: "",
  column_min_width: "200px",
  schema: [
    { name: "name", label: "Name", selector: { text: {} } },
    { name: "icon", label: "Icon", selector: { icon: {} } },
  ],
} as const;

export const ACTIONS_SCHEMA = [
  { name: "tap_action", label: "Tap action", selector: { ui_action: {} } },
  { name: "hold_action", label: "Hold action", selector: { ui_action: {} } },
  { name: "double_tap_action", label: "Double tap action", selector: { ui_action: {} } },
] as const;

export const ACTIONS_EXPANDABLE = {
  title: "Actions",
  name: "",
  type: "expandable" as const,
  schema: ACTIONS_SCHEMA,
} as const;
