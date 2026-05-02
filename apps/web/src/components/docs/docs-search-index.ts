export type SearchEntry = {
  title: string;
  /** Short hint shown under the title in results. */
  description?: string;
  /** Route path including optional fragment. */
  to: string;
  /** Breadcrumb shown to the right of the title. */
  breadcrumb: string;
  card?: "power" | "energy" | "general";
  type: "page" | "section" | "option" | "example";
  /** Extra strings used for matching but not shown. */
  keywords?: string[];
};

const POWER = "Power Flow Card Plus";
const ENERGY = "Energy Flow Card Plus";

const PAGES: SearchEntry[] = [
  {
    title: "Introduction",
    description: "Overview of flixlix-cards.",
    to: "/",
    breadcrumb: "Docs",
    card: "general",
    type: "page",
    keywords: ["home", "landing", "start"],
  },
  {
    title: "How to contribute",
    description: "Set up the monorepo and open a PR.",
    to: "/contributing",
    breadcrumb: "Project",
    card: "general",
    type: "page",
    keywords: ["pull request", "issue", "fork", "monorepo", "pnpm", "changeset"],
  },
];

function cardPages(
  card: "power" | "energy",
  basePath: "/power-flow-card-plus" | "/energy-flow-card-plus",
  cardLabel: string
): SearchEntry[] {
  return [
    {
      title: "Overview",
      description: `What ${cardLabel} is and what it can do.`,
      to: basePath,
      breadcrumb: cardLabel,
      card,
      type: "page",
      keywords: ["intro", "scope", "highlights"],
    },
    {
      title: "Installation",
      description: "HACS and manual installation instructions.",
      to: `${basePath}/installation`,
      breadcrumb: cardLabel,
      card,
      type: "page",
      keywords: ["hacs", "install", "resource", "lovelace"],
    },
    {
      title: "Configuration",
      description: "Full reference of every option.",
      to: `${basePath}/configuration`,
      breadcrumb: cardLabel,
      card,
      type: "page",
      keywords: ["yaml", "options", "reference"],
    },
    {
      title: "Examples",
      description: "Copy-pastable configs for common setups.",
      to: `${basePath}/examples`,
      breadcrumb: cardLabel,
      card,
      type: "page",
      keywords: ["yaml", "snippet", "minimal"],
    },
  ];
}

function configSections(
  card: "power" | "energy",
  basePath: "/power-flow-card-plus" | "/energy-flow-card-plus",
  cardLabel: string
): SearchEntry[] {
  const make = (
    id: string,
    title: string,
    description: string,
    keywords?: string[]
  ): SearchEntry => ({
    title,
    description,
    to: `${basePath}/configuration#${id}`,
    breadcrumb: `${cardLabel} → Configuration`,
    card,
    type: "section",
    keywords,
  });
  const sections = [
    make(
      "card-options",
      "Card options",
      "Top-level options like type, title, decimals, flow rate."
    ),
    make("actions", "Action configuration", "tap_action / hold_action / double_tap_action."),
    make(
      "entities",
      "Entities object",
      "Grid, solar, battery, individual, home, fossil_fuel_percentage."
    ),
    make(
      "grid",
      "Grid configuration",
      "Bidirectional or split grid entity, display_state, colors."
    ),
    make("solar", "Solar configuration", "Solar entity, name, icon, color options."),
    make("battery", "Battery configuration", "Battery entity, state_of_charge, color options."),
    make("individual", "Individual devices", "Up to 4 extra circles (car, EV, etc)."),
    make("home", "Home configuration", "Home entity, subtract_individual, override_state."),
    make("fossil-fuel", "Fossil fuel / low-carbon", "Fossil fuel percentage circle config."),
    make("color-object", "Color object", "Production / consumption HEX colors."),
    make("split-entities", "Split entities", "Separate sensors for production and consumption."),
    make("secondary-info", "Secondary info", "Extra value next to a circle, supports templates."),
    make("power-outage", "Power outage", "Configure outage detection and generator entity."),
    make(
      "display-zero-lines",
      "Display zero lines",
      "show / hide / transparency / grey_out / custom."
    ),
    make("flow-formula", "Flow formulas", "Legacy vs new (absolute) flow rate model."),
  ];
  if (card === "energy") {
    sections.push(
      make(
        "collection-key",
        "Energy collection key",
        "Bind to a specific energy dashboard collection."
      )
    );
  }
  return sections;
}

function configOptions(
  card: "power" | "energy",
  basePath: "/power-flow-card-plus" | "/energy-flow-card-plus",
  cardLabel: string
): SearchEntry[] {
  const make = (
    name: string,
    description: string,
    sectionId = "card-options",
    extraKeywords?: string[]
  ): SearchEntry => ({
    title: name,
    description,
    to: `${basePath}/configuration#${sectionId}`,
    breadcrumb: `${cardLabel} → Configuration`,
    card,
    type: "option",
    keywords: extraKeywords,
  });
  const opts = [
    make("type", "Card type identifier (required)."),
    make("entities", "Entities object (required)."),
    make("title", "Title shown above the card."),
    make("dashboard_link", "URL to a dashboard, shown as a link."),
    make("kilo_decimals", `Decimals shown when ${card === "power" ? "kW" : "kWh"} are displayed.`),
    make("base_decimals", `Decimals shown when ${card === "power" ? "W" : "Wh"} are displayed.`),
    make(
      "kilo_threshold",
      `${card === "power" ? "Watts" : "Watt-hours"} before switching to ${card === "power" ? "kW" : "kWh"}.`
    ),
    make("min_flow_rate", "Time (s) for the fastest dot to travel a line."),
    make("max_flow_rate", "Time (s) for the slowest dot to travel a line."),
    make("clickable_entities", "Open the entity's more-info dialog when clicking a circle."),
    make("min_expected_power", "Minimum value for the new flow formula.", "flow-formula"),
    make("max_expected_power", "Maximum value for the new flow formula.", "flow-formula"),
    make("display_zero_lines", "Behavior of inactive lines.", "display-zero-lines"),
    make("full_size", "Experimental, fill the screen in panel mode."),
    make("style_ha_card", "CSS applied to the card container."),
    make("style_card_content", "CSS applied to the content area."),
    make(
      "use_new_flow_rate_model",
      "Switch to the new (more intuitive) flow formula.",
      "flow-formula"
    ),
    make("sort_individual_devices", "Sort individual devices by value, then id, then name."),
    make("allow_layout_break", "Force showing up to 4 individual devices."),
    make("tap_action", "Action triggered on tap.", "actions"),
    make("hold_action", "Action triggered on long press.", "actions"),
    make("double_tap_action", "Action triggered on double tap.", "actions"),
    make("display_state", "two_way / one_way / one_way_no_zero; grid & battery.", "grid", [
      "two_way",
      "one_way",
      "one_way_no_zero",
    ]),
    make("color_circle", "Coloring of the circle stroke.", "grid"),
    make("color_icon", "Coloring of the icon.", "grid"),
    make("color_value", "Coloring of the value text.", "grid"),
    make("display_zero_tolerance", "Treat states below this number as zero.", "grid"),
    make("power_outage", "Configure outage detection.", "power-outage"),
    make("invert_state", "Invert the production/consumption sign convention.", "grid"),
    make("state_of_charge", "Battery state of charge sensor (required).", "battery"),
    make("state_of_charge_unit", "Unit for the SoC.", "battery"),
    make("state_of_charge_decimals", "Decimals for the SoC.", "battery"),
    make("color_state_of_charge_value", "Coloring of the SoC text.", "battery"),
    make("subtract_individual", "Subtract individual devices from home consumption.", "home"),
    make("override_state", "Use the home entity state directly.", "home"),
    make("state_type", "fossil_fuel_percentage state type, power or percentage.", "fossil-fuel"),
    make("calculate_flow_rate", "Use formula or fixed dot interval (seconds).", "fossil-fuel"),
    make("inverted_animation", "Reverse dot direction for an individual device.", "individual"),
    make("decimals", "Decimals for an individual device value.", "individual"),
    make("display_zero", "Show device when state is 0 / unavailable.", "individual"),
    make("template", "HA template evaluated reactively (secondary info).", "secondary-info"),
    make("accept_negative", "Show negative values as-is.", "secondary-info"),
    make("sum_total", "Sum solar's secondary info into the main entity.", "secondary-info"),
  ];
  if (card === "energy") {
    opts.push(make("collection_key", "Bind to a specific energy collection.", "collection-key"));
  }
  return opts;
}

function exampleEntries(
  card: "power" | "energy",
  basePath: "/power-flow-card-plus" | "/energy-flow-card-plus",
  cardLabel: string
): SearchEntry[] {
  const make = (id: string, title: string, description: string): SearchEntry => ({
    title,
    description,
    to: `${basePath}/examples#${id}`,
    breadcrumb: `${cardLabel} → Examples`,
    card,
    type: "example",
  });
  const items = [
    make("only-grid", "Only grid", "Minimal config with just the grid entity."),
    make("grid-solar", "Grid + solar", "Add a solar entity to the grid setup."),
    make("grid-solar-battery", "Grid + solar + battery", "Three-source setup with SoC."),
    make("full-config", "Mix & match", "Full config showcasing many options."),
  ];
  if (card === "energy") {
    items.push(
      make(
        "multi-dashboard",
        "Multiple energy dashboards",
        "Use collection_key to pick a dashboard."
      )
    );
  }
  return items;
}

const CONTRIBUTING_SECTIONS: SearchEntry[] = [
  {
    title: "Prerequisites",
    description: "Node.js, pnpm, optional Docker.",
    to: "/contributing#prerequisites",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
  },
  {
    title: "Repository layout",
    description: "Structure of the monorepo.",
    to: "/contributing#repo-layout",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["turborepo", "workspace"],
  },
  {
    title: "Local setup",
    description: "Clone, fork and install dependencies.",
    to: "/contributing#setup",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["pnpm install", "git clone"],
  },
  {
    title: "Working on a card",
    description: "Run a card in dev mode and test it in HA.",
    to: "/contributing#working-on-a-card",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["pnpm dev", "rollup", "watch"],
  },
  {
    title: "Working on the docs site",
    description: "Run the apps/web site locally.",
    to: "/contributing#docs-site",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["tanstack router", "vite"],
  },
  {
    title: "Code quality checks",
    description: "Lint, format and type checks before pushing.",
    to: "/contributing#quality",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["eslint", "prettier", "typecheck", "vitest"],
  },
  {
    title: "Add a changeset",
    description: "Generate release notes via Changesets.",
    to: "/contributing#changesets",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["release", "version"],
  },
  {
    title: "Commit & open a PR",
    description: "Branch, commit, push, open a pull request.",
    to: "/contributing#commit",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["conventional commits", "github"],
  },
];

export const SEARCH_ENTRIES: SearchEntry[] = [
  ...PAGES,
  ...cardPages("power", "/power-flow-card-plus", POWER),
  ...cardPages("energy", "/energy-flow-card-plus", ENERGY),
  ...configSections("power", "/power-flow-card-plus", POWER),
  ...configSections("energy", "/energy-flow-card-plus", ENERGY),
  ...configOptions("power", "/power-flow-card-plus", POWER),
  ...configOptions("energy", "/energy-flow-card-plus", ENERGY),
  ...exampleEntries("power", "/power-flow-card-plus", POWER),
  ...exampleEntries("energy", "/energy-flow-card-plus", ENERGY),
  ...CONTRIBUTING_SECTIONS,
];

function score(query: string, entry: SearchEntry): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const haystacks: { value: string; weight: number }[] = [
    { value: entry.title.toLowerCase(), weight: 10 },
    { value: (entry.description ?? "").toLowerCase(), weight: 4 },
    { value: entry.breadcrumb.toLowerCase(), weight: 2 },
    ...(entry.keywords ?? []).map((k) => ({ value: k.toLowerCase(), weight: 5 })),
  ];

  let total = 0;
  for (const { value, weight } of haystacks) {
    if (!value) continue;
    if (value === q) total += weight * 4;
    else if (value.startsWith(q)) total += weight * 2;
    else if (value.includes(q)) total += weight;
  }

  // tokens: every word in the query must appear somewhere
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const combined = haystacks.map((h) => h.value).join(" ");
    if (tokens.every((t) => combined.includes(t))) total += 6;
    else return 0; // multi-word queries require all tokens to match
  }

  // boost type
  if (entry.type === "page" && total > 0) total += 1;

  return total;
}

export function searchDocs(query: string, max = 8): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  return SEARCH_ENTRIES.map((entry) => ({ entry, s: score(q, entry) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map(({ entry }) => entry);
}

/**
 * Curated suggestions surfaced before the user types anything. Grouped to make
 * the empty state of the command menu read like a quick-start guide.
 */
export type SuggestionGroup = {
  label: string;
  entries: SearchEntry[];
};

function findEntry(predicate: (entry: SearchEntry) => boolean): SearchEntry | undefined {
  return SEARCH_ENTRIES.find(predicate);
}

function pick(predicates: Array<(entry: SearchEntry) => boolean>): SearchEntry[] {
  const out: SearchEntry[] = [];
  const seen = new Set<string>();
  for (const predicate of predicates) {
    const entry = findEntry(predicate);
    if (entry && !seen.has(entry.to)) {
      out.push(entry);
      seen.add(entry.to);
    }
  }
  return out;
}

export const SUGGESTED_GROUPS: SuggestionGroup[] = [
  {
    label: "Get started",
    entries: pick([
      (e) => e.to === "/",
      (e) => e.to === "/power-flow-card-plus" && e.type === "page",
      (e) => e.to === "/energy-flow-card-plus" && e.type === "page",
      (e) => e.to === "/power-flow-card-plus/installation",
      (e) => e.to === "/energy-flow-card-plus/installation",
    ]),
  },
  {
    label: "Popular configuration",
    entries: pick([
      (e) => e.to === "/power-flow-card-plus/configuration#grid",
      (e) => e.to === "/power-flow-card-plus/configuration#solar",
      (e) => e.to === "/power-flow-card-plus/configuration#battery",
      (e) => e.to === "/power-flow-card-plus/configuration#individual",
      (e) => e.to === "/energy-flow-card-plus/configuration#collection-key",
    ]),
  },
  {
    label: "Project",
    entries: pick([(e) => e.to === "/contributing" && e.type === "page"]),
  },
];
