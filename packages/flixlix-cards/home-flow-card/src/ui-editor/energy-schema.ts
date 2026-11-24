import localize from "@flixlix-cards/shared/i18n";
import { DEFAULT_VIEWS, type HomeFlowCardConfig, type HomeFlowView, VIEWS } from "../types";

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

/** Which of the picked views the card opens on; only worth asking with two or more. */
const defaultViewField = (views: readonly HomeFlowView[]) =>
  ({
    name: "default_view",
    selector: {
      select: {
        mode: "dropdown",
        options: views.map((view) => ({ value: view, label: localize(`card.view.${view}`) })),
      },
    },
  }) as const;

const inViewOrder = (views: unknown) =>
  VIEWS.filter((view) => Array.isArray(views) && views.includes(view));

export const energyEntities = (views: unknown = DEFAULT_VIEWS) => {
  const picked = inViewOrder(views);
  return {
    type: "expandable",
    name: "",
    title: localize("editor.energy_entities"),
    icon: "mdi:calendar-today",
    schema: [
      viewsField,
      ...(picked.length > 1 ? [defaultViewField(picked)] : []),
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
          { name: "gas", selector: { entity: {} } },
        ],
      },
    ],
  } as const;
};

export const withViewFields = (config: HomeFlowCardConfig): HomeFlowCardConfig => {
  const views = config.views ?? [...DEFAULT_VIEWS];
  return { ...config, views, default_view: config.default_view ?? inViewOrder(views)[0] };
};

export const fromViewFields = ({
  views,
  default_view: defaultView,
  ...config
}: Record<string, unknown>) => {
  if (config.mode === "energy") {
    const { energy_entities: _energy, ...energyMode } = config;
    return energyMode;
  }
  const picked = inViewOrder(views);
  const isDefault =
    picked.length === DEFAULT_VIEWS.length &&
    picked.every((view, index) => view === DEFAULT_VIEWS[index]);
  // the first view is where the card opens anyway; a view no longer picked falls back to it
  const opensElsewhere = defaultView !== picked[0] && picked.some((view) => view === defaultView);
  return {
    ...config,
    ...(isDefault ? {} : { views: picked }),
    ...(opensElsewhere ? { default_view: defaultView } : {}),
  };
};
