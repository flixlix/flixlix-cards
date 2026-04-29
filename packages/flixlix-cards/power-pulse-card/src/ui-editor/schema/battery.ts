import { ACTIONS_EXPANDABLE, NAME_ICON_GRID, POWER_ENTITY_SELECTOR } from "./_schema-shared";

export const batterySchema = [
  { name: "entity", label: "Power entity", ...POWER_ENTITY_SELECTOR },
  {
    name: "state_of_charge",
    label: "State of charge entity",
    selector: { entity: { domain: "sensor" } },
  },
  {
    name: "show_state_of_charge",
    label: "Show state of charge",
    default: true,
    selector: { boolean: {} },
  },
  NAME_ICON_GRID,
  {
    title: "Colors",
    name: "color",
    type: "expandable",
    schema: [
      {
        type: "grid",
        name: "",
        column_min_width: "200px",
        schema: [
          { name: "in", label: "Charging color", selector: { ui_color: {} } },
          { name: "out", label: "Discharging color", selector: { ui_color: {} } },
        ],
      },
    ],
  },
  ACTIONS_EXPANDABLE,
] as const;
