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

const viewSelect = (name: "view_first" | "view_second") => ({
  name,
  selector: {
    select: {
      mode: "dropdown",
      options: VIEWS.map((view) => ({ value: view, label: localize(`card.view.${view}`) })),
    },
  },
});

export const energyEntities = {
  type: "expandable",
  name: "",
  title: localize("editor.energy_entities"),
  icon: "mdi:calendar-today",
  schema: [
    { type: "grid", name: "", schema: [viewSelect("view_first"), viewSelect("view_second")] },
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

export const withViewFields = (config: HomeFlowCardConfig) => {
  const [first, second] = config.views?.length ? config.views : DEFAULT_VIEWS;
  return { ...config, view_first: first, view_second: second };
};

export const fromViewFields = ({
  view_first: first,
  view_second: second,
  ...config
}: Record<string, unknown>) => {
  const views = [first, second].filter((view) => typeof view === "string" && view !== "");
  const isDefault =
    views.length === DEFAULT_VIEWS.length &&
    views.every((view, index) => view === DEFAULT_VIEWS[index]);
  const { views: _views, ...rest } = config;
  return isDefault ? rest : { ...rest, views };
};
