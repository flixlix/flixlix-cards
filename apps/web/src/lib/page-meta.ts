import { SITE_NAME } from "./site";

export type PageMeta = {
  title: string;
  description: string;
  h1: string;
};

const withSite = (h1: string) => `${h1} | ${SITE_NAME}`;

type CardSections = {
  overview: string;
  installation: string;
  configuration: string;
  examples: string;
  playground?: string;
};

function cardMeta(
  base: string,
  name: string,
  descriptions: CardSections,
  overview?: { title?: string; h1?: string }
): Record<string, PageMeta> {
  const overviewH1 = overview?.h1 ?? `${name} for Home Assistant`;
  const pages: { path: string; h1: string; title?: string; description: string }[] = [
    {
      path: base,
      h1: overviewH1,
      title: overview?.title,
      description: descriptions.overview,
    },
    {
      path: `${base}/installation`,
      h1: `Install ${name} in Home Assistant`,
      description: descriptions.installation,
    },
    {
      path: `${base}/configuration`,
      h1: `Configure ${name} for Home Assistant`,
      description: descriptions.configuration,
    },
    {
      path: `${base}/examples`,
      h1: `${name} examples for Home Assistant`,
      description: descriptions.examples,
    },
  ];
  if (descriptions.playground) {
    pages.push({
      path: `${base}/playground`,
      h1: `Try ${name} in Home Assistant`,
      description: descriptions.playground,
    });
  }
  return Object.fromEntries(
    pages.map((page) => [
      page.path,
      {
        title: page.title ?? withSite(page.h1),
        description: page.description,
        h1: page.h1,
      },
    ])
  );
}

const HOME_H1 = "Solar, battery and grid power flow cards for Home Assistant";

export const NOT_FOUND_META: PageMeta = {
  title: withSite("Page not found"),
  description:
    "That page is not on cards.flixlix.com. Browse the Home Assistant Lovelace cards for solar, battery and grid power flow, or open a setup guide.",
  h1: "Page not found",
};

const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: withSite(HOME_H1),
    description:
      "Free Lovelace cards for Home Assistant: live solar, battery and grid power flow, period energy, a donut breakdown, a date picker and a sortable list.",
    h1: HOME_H1,
  },
  "/contributing": {
    title: withSite("How to contribute to flixlix-cards"),
    description:
      "Contribute to the flixlix-cards monorepo: install pnpm, run a Home Assistant Lovelace card locally, add a changeset and open a pull request.",
    h1: "How to contribute to flixlix-cards",
  },
  ...cardMeta("/power-flow-card-plus", "Power Flow Card Plus", {
    overview:
      "Power Flow Card Plus is a Home Assistant Lovelace card for live solar, battery, grid and home power flow, plus up to four devices. Install it with HACS.",
    installation:
      "Install Power Flow Card Plus on Home Assistant from the Marketplace or HACS, or add the Lovelace resource yourself. Then pick solar, battery and grid sensors.",
    configuration:
      "Configure Power Flow Card Plus in Home Assistant: grid, solar, battery, home and device entities, colours, flow lines, a power outage and the visual editor.",
    examples:
      "Copy-paste Power Flow Card Plus examples for Home Assistant: solar and battery, grid import and export, individual devices and a minimal config.",
    playground:
      "Try Power Flow Card Plus live in the browser: edit the Lovelace YAML and watch solar, battery and grid power flow. Nothing to install in Home Assistant.",
  }),
  ...cardMeta("/energy-flow-card-plus", "Energy Flow Card Plus", {
    overview:
      "Energy Flow Card Plus is a Home Assistant Lovelace card for solar, battery and grid energy over a day, week or year. It reads your Energy dashboard.",
    installation:
      "Install Energy Flow Card Plus on Home Assistant from the Marketplace or HACS, or add the Lovelace resource yourself. It shows period energy in kilowatt-hours.",
    configuration:
      "Configure Energy Flow Card Plus in Home Assistant: energy entities for grid, solar and battery, the collection key, colours and the dashboard's period.",
    examples:
      "Copy-paste Energy Flow Card Plus examples for Home Assistant, including a setup paired with the energy period selector for day, week and year totals.",
    playground:
      "Try Energy Flow Card Plus live under Home Assistant's period selector: pick a day or week, edit the Lovelace config and watch the energy flows.",
  }),
  ...cardMeta("/energy-breakdown-card", "Energy Breakdown Card", {
    overview:
      "Energy Breakdown Card is a Home Assistant Lovelace card: a donut or stacked bar of where energy went, with a legend, a tooltip and small loads grouped.",
    installation:
      "Install Energy Breakdown Card on Home Assistant from its HACS custom repository or by hand. It is not in the default catalog. Donut and bar views included.",
    configuration:
      "Configure Energy Breakdown Card in Home Assistant: the entities, donut or bar, legend, tooltip, decimals and how small consumers fold into one slice.",
    examples:
      "Copy-paste Energy Breakdown Card examples for Home Assistant: a donut of energy use, a stacked bar, and a legend showing values and percentages.",
  }),
  ...cardMeta("/sortable-list-card", "Sortable List Card", {
    overview:
      "Sortable List Card is a Home Assistant Lovelace card. Drag a list into order and save it with any service call. Built for a HEMS load-priority list.",
    installation:
      "Install Sortable List Card on Home Assistant from its HACS custom repository or by hand. It is not in the default catalog. Drag rows to reorder a list.",
    configuration:
      "Configure Sortable List Card in Home Assistant: the items, the entity that stores the order, CSV or JSON, and the service that saves a HEMS priority list.",
    examples:
      "Copy-paste Sortable List Card examples for Home Assistant, including a HEMS load-priority list that is saved through a service call you choose.",
  }),
  ...cardMeta("/energy-period-selector-plus", "Energy Period Selector Plus", {
    overview:
      "Energy Period Selector Plus is a custom Home Assistant energy date picker: day, week, month, year or any range, with compare, previous and next.",
    installation:
      "Install Energy Period Selector Plus on Home Assistant from its HACS custom repository or by hand. It sets the period for the energy cards on that dashboard.",
    configuration:
      "Configure Energy Period Selector Plus, a custom Home Assistant energy date picker: which periods to show, compare, previous and next, and the collection.",
    examples:
      "Copy-paste Energy Period Selector Plus examples for Home Assistant, including one paired with Energy Flow Card Plus to set the energy period.",
    playground:
      "Try Energy Period Selector Plus live in the browser, driving Energy Flow Card Plus. Pick a day, week, month or custom range, with nothing to install.",
  }),
  ...cardMeta(
    "/home-flow-card",
    "Home Flow Card",
    {
      overview:
        "Home Flow Card is an isometric house power card for Home Assistant. Solar sits on the roof, the battery on the wall and grid power flows to the street.",
      installation:
        "Install Home Flow Card, an isometric house power card, on Home Assistant from the Marketplace or HACS, or add the Lovelace resource by hand.",
      configuration:
        "Configure Home Flow Card for Home Assistant: grid, solar and battery sensors on an isometric house, plus an electric car, a heat pump or a generator.",
      examples:
        "Copy-paste Home Flow Card examples for Home Assistant: an isometric house with solar, battery and grid power, a car, a heat pump or a grid outage.",
      playground:
        "Try Home Flow Card live: an isometric house power card for Home Assistant. Move solar, battery and grid, or open a grid outage. Nothing to install.",
    },
    {
      h1: "Home Flow Card, an isometric house power card for Home Assistant",
      title: withSite("Home Flow Card: isometric house for Home Assistant"),
    }
  ),
  "/guides": {
    title: withSite("Which Home Assistant power flow card to use"),
    description:
      "Which Home Assistant power flow card to use: live watts, an isometric house, period energy, a donut breakdown, a date picker or a sortable HEMS list.",
    h1: "Which Home Assistant power flow card to use",
  },
  "/guides/solar-battery-power-flow": {
    title: withSite("Solar and battery power flow in Home Assistant"),
    description:
      "Set up live solar, battery and grid power flow on a Home Assistant Lovelace dashboard with Power Flow Card Plus or the isometric Home Flow Card.",
    h1: "Solar and battery power flow in Home Assistant",
  },
  "/guides/power-flow-card-plus-vs-power-flow-card": {
    title: withSite("Power Flow Card Plus vs Power Flow Card"),
    description:
      "Power Flow Card Plus compared with ulic75's original Power Flow Card for Home Assistant. That Lovelace card is archived and points here. What each card draws.",
    h1: "Power Flow Card Plus vs the original Power Flow Card",
  },
  "/guides/power-flow-card-plus-vs-sunsynk": {
    title: withSite("Power Flow Card Plus vs Sunsynk Power Flow Card"),
    description:
      "Power Flow Card Plus vs the Sunsynk Power Flow Card: a Home Assistant circle diagram for any power sensors, or a card that emulates an inverter screen.",
    h1: "Power Flow Card Plus vs the Sunsynk Power Flow Card",
  },
  "/guides/power-flow-card-plus-vs-tesla-style": {
    title: withSite("Power Flow Card Plus vs Tesla Style Solar Power Card"),
    description:
      "Power Flow Card Plus vs the Tesla Style Solar Power Card for Home Assistant: live solar, battery and grid power, and how each Lovelace card expects its sensors.",
    h1: "Power Flow Card Plus vs the Tesla Style Solar Power Card",
  },
  "/guides/energy-distribution-card-alternative": {
    title: withSite("Energy Distribution card alternative for Home Assistant"),
    description:
      "An alternative to Home Assistant's built-in Energy Distribution card: live power with Power Flow Card Plus, or period energy with Energy Flow Card Plus.",
    h1: "An alternative to Home Assistant's Energy Distribution card",
  },
};

export function pageMeta(path: string): PageMeta {
  const meta = PAGE_META[path];
  if (!meta) {
    throw new Error(`Missing page meta for ${path}`);
  }
  return meta;
}

export function heading(path: string): string {
  return pageMeta(path).h1;
}

export const PAGE_META_PATHS = Object.keys(PAGE_META);
