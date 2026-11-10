import localize from "@flixlix-cards/shared/i18n";
import { PERIODS } from "../types";

const twoWayEnergy = (node: "grid" | "battery") =>
  ({
    type: "expandable",
    name: node,
    title: localize(`editor.${node}`),
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "consumption", selector: { entity: {} } },
          { name: "production", selector: { entity: {} } },
        ],
      },
    ],
  }) as const;

export const energyEntities = {
  type: "expandable",
  name: "",
  title: localize("editor.energy_entities"),
  icon: "mdi:calendar-today",
  schema: [
    {
      name: "periods",
      selector: {
        select: {
          multiple: true,
          mode: "list",
          options: PERIODS.map((period) => ({
            value: period,
            label: localize(`card.view.${period}`),
          })),
        },
      },
    },
    {
      type: "grid",
      name: "energy_entities",
      column_min_width: "100%",
      schema: [
        twoWayEnergy("grid"),
        { name: "solar", selector: { entity: {} } },
        twoWayEnergy("battery"),
        { name: "home", selector: { entity: {} } },
        { name: "generator", selector: { entity: {} } },
        { name: "car", selector: { entity: {} } },
        { name: "heat_pump", selector: { entity: {} } },
      ],
    },
  ],
} as const;
