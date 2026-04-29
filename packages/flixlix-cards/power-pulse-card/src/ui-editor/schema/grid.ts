import { ACTIONS_EXPANDABLE, NAME_ICON_GRID, POWER_ENTITY_SELECTOR } from "./_schema-shared";

export const gridSchema = [
  { name: "entity", label: "Entity", ...POWER_ENTITY_SELECTOR },
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
          { name: "consumption", label: "Consumption color", selector: { ui_color: {} } },
          { name: "production", label: "Production color", selector: { ui_color: {} } },
        ],
      },
    ],
  },
  ACTIONS_EXPANDABLE,
] as const;
