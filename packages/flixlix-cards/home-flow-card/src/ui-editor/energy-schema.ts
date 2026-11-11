import localize from "@flixlix-cards/shared/i18n";
import { DEFAULT_VIEWS, type HomeFlowCardConfig, VIEWS } from "../types";

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

const viewsField = {
  name: "views",
  selector: {
    select: {
      multiple: true,
      mode: "list",
      options: VIEWS.map((view) => ({ value: view, label: localize(`card.view.${view}`) })),
    },
  },
} as const;

export const energyEntities = {
  type: "expandable",
  name: "",
  title: localize("editor.energy_entities"),
  icon: "mdi:calendar-today",
  schema: [
    viewsField,
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

export const withViewFields = (config: HomeFlowCardConfig) => ({
  ...config,
  views: config.views?.length ? config.views : [...DEFAULT_VIEWS],
});

const inViewOrder = (views: unknown) =>
  VIEWS.filter((view) => Array.isArray(views) && views.includes(view));

export const fromViewFields = ({ views, ...config }: Record<string, unknown>) => {
  if (config.mode === "energy") {
    const { energy_entities: _energy, ...energyMode } = config;
    return energyMode;
  }
  const picked = inViewOrder(views);
  const isDefault =
    picked.length === DEFAULT_VIEWS.length &&
    picked.every((view, index) => view === DEFAULT_VIEWS[index]);
  return isDefault || picked.length === 0 ? config : { ...config, views: picked };
};
