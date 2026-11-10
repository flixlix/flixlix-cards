export type SearchEntry = {
  title: string;
  /** Short hint shown under the title in results. */
  description?: string;
  /** Route path including optional fragment. */
  to: string;
  /** Breadcrumb shown to the right of the title. */
  breadcrumb: string;
  card?: "power" | "house" | "energy" | "breakdown" | "sortable" | "period" | "general";
  type: "page" | "section" | "option" | "example";
  /** Extra strings used for matching but not shown. */
  keywords?: string[];
};

const POWER = "Power Flow Card Plus";
const ENERGY = "Energy Flow Card Plus";
const BREAKDOWN = "Energy Breakdown Card";
const BREAKDOWN_BASE = "/energy-breakdown-card" as const;
const PERIOD = "Energy Period Selector Plus";
const PERIOD_BASE = "/energy-period-selector-plus" as const;
const HOUSE = "Home Flow Card";
const HOUSE_BASE = "/home-flow-card" as const;
const SORTABLE = "Sortable List Card";
const SORTABLE_BASE = "/sortable-list-card" as const;

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
    keywords: ["pull request", "issue", "fork", "monorepo", "pnpm", "changeset", "license", "mit"],
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
      "Grid, solar, battery, individual, auxiliary, home, fossil_fuel_percentage."
    ),
    make(
      "grid",
      "Grid configuration",
      "Bidirectional or split grid entity, display_state, colors."
    ),
    make("solar", "Solar configuration", "Solar entity, name, icon, color options."),
    make("battery", "Battery configuration", "Battery entity, state_of_charge, color options."),
    make("individual", "Individual devices", "Up to 4 extra circles (car, EV, etc)."),
    make(
      "auxiliary",
      "Auxiliary",
      "Display-only circle under the grid: wind share, gas, virtual battery."
    ),
    make("home", "Home configuration", "Home entity, subtract_individual, override_state."),
    make("fossil-fuel", "Fossil fuel / low-carbon", "Fossil fuel percentage circle config."),
    make("color-object", "Color object", "Production / consumption / idle HEX colors."),
    make("split-entities", "Split entities", "Separate sensors for production and consumption."),
    make("secondary-info", "Secondary info", "Extra value next to a circle, supports templates."),
    make("power-outage", "Power outage", "Configure outage detection and generator entity."),
    make(
      "display-zero-lines",
      "Display zero lines",
      "show / hide / transparency / grey_out / custom."
    ),
    make(
      "topology",
      "Topology",
      "standard / battery_hub / isolated_battery: which wires the card draws."
    ),
    make(
      "custom-css",
      "Custom CSS",
      "card-mod selectors for each circle's value, icon and secondary info."
    ),
    make(
      "flow-formula",
      "Flow formulas",
      "Flow rate models, and how durations scale with line length."
    ),
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
    make("min_flow_rate", "Time (s) for the fastest dot to travel 175px of line."),
    make("max_flow_rate", "Time (s) for the slowest dot to travel 175px of line."),
    make("clickable_entities", "Open the entity's more-info dialog when clicking a circle."),
    ...(card === "energy"
      ? []
      : [
          make(
            "min_expected_power",
            "Minimum value for the duration and speed flow rate models.",
            "flow-formula"
          ),
          make(
            "max_expected_power",
            "Maximum value for the duration and speed flow rate models.",
            "flow-formula"
          ),
        ]),
    make("display_zero_lines", "Behavior of inactive lines.", "display-zero-lines"),
    make("full_size", "Experimental, fill the screen in panel mode."),
    make("style_ha_card", "CSS applied to the card container."),
    make("style_card_content", "CSS applied to the content area."),
    ...(card === "energy"
      ? []
      : [
          make(
            "flow_rate_model",
            "duration (default), speed or relative: how dot speed follows power.",
            "flow-formula",
            ["duration", "speed", "relative"]
          ),
          make(
            "use_new_flow_rate_model",
            "Older alias of flow_rate_model; false is relative.",
            "flow-formula"
          ),
        ]),
    make("sort_individual_devices", "Sort individual devices by value, then id, then name."),
    make("allow_layout_break", "Force showing up to 4 individual devices."),
    make("topology", "Which wires exist: standard, battery_hub or isolated_battery.", "topology", [
      "standard",
      "battery_hub",
      "isolated_battery",
      "power station",
    ]),
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
    make("color_alert", "Color of the outage icon and label.", "power-outage", ["outage", "red"]),
    make("invert_state", "Invert the production/consumption sign convention.", "grid"),
    make("state_of_charge", "Battery state of charge sensor (required).", "battery"),
    make("state_of_charge_unit", "Unit for the SoC.", "battery"),
    make("state_of_charge_decimals", "Decimals for the SoC.", "battery"),
    make("color_state_of_charge_value", "Coloring of the SoC text.", "battery"),
    make("subtract_individual", "Subtract individual devices from home consumption.", "home"),
    make("override_state", "Use the home entity state directly.", "home"),
    make("state_type", "fossil_fuel_percentage state type, power or percentage.", "fossil-fuel"),
    make(
      "calculate_flow_rate",
      "Calculated rate by default; false = fixed pace, number = seconds.",
      "fossil-fuel"
    ),
    make("inverted_animation", "Reverse dot direction for an individual device.", "individual"),
    make("connect_to", "Auxiliary line to the grid, the battery or none.", "auxiliary"),
    make("decimals", "Decimals for a grid, solar, battery or individual device value.", "grid"),
    make(
      "unit_of_measurement",
      "Custom unit for grid, solar, battery or an individual device; shown without k/M scaling.",
      "grid"
    ),
    make("unit_white_space", "Whitespace between value and unit.", "grid"),
    make("display_zero", "Show device when state is 0 / unavailable.", "individual"),
    make("template", "HA template evaluated reactively (secondary info).", "secondary-info"),
    make(
      "accept_negative",
      "Show negative values as-is; on an individual device, flip its dots when it feeds the home.",
      "secondary-info"
    ),
    make(
      "sum_total",
      "Add the secondary entity to the main entity of solar or an individual device.",
      "secondary-info"
    ),
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

function breakdownPages(): SearchEntry[] {
  return [
    {
      title: "Overview",
      description: `What ${BREAKDOWN} is and what it can do.`,
      to: BREAKDOWN_BASE,
      breadcrumb: BREAKDOWN,
      card: "breakdown",
      type: "page",
      keywords: ["intro", "scope", "highlights", "donut", "bar", "chart"],
    },
    {
      title: "Installation",
      description: "Marketplace, HACS custom repository and manual installation instructions.",
      to: `${BREAKDOWN_BASE}/installation`,
      breadcrumb: BREAKDOWN,
      card: "breakdown",
      type: "page",
      keywords: ["marketplace", "hacs", "custom repository", "install", "resource", "lovelace"],
    },
    {
      title: "Configuration",
      description: "Full reference of every option.",
      to: `${BREAKDOWN_BASE}/configuration`,
      breadcrumb: BREAKDOWN,
      card: "breakdown",
      type: "page",
      keywords: ["yaml", "options", "reference"],
    },
    {
      title: "Examples",
      description: "Copy-pastable configs for common setups.",
      to: `${BREAKDOWN_BASE}/examples`,
      breadcrumb: BREAKDOWN,
      card: "breakdown",
      type: "page",
      keywords: ["yaml", "snippet", "minimal"],
    },
  ];
}

const breakdownConfigSection = (
  id: string,
  title: string,
  description: string,
  keywords?: string[]
): SearchEntry => ({
  title,
  description,
  to: `${BREAKDOWN_BASE}/configuration#${id}`,
  breadcrumb: `${BREAKDOWN} → Configuration`,
  card: "breakdown",
  type: "section",
  keywords,
});

function breakdownConfigSections(): SearchEntry[] {
  return [
    breakdownConfigSection(
      "card-options",
      "Card options",
      "Type, title, chart variant, and entities."
    ),
    breakdownConfigSection(
      "display",
      "Legend & tooltip",
      "Toggle and position the legend, tooltip, total, icons."
    ),
    breakdownConfigSection("data", "Data shaping", "Sort, group, decimals, and unit handling.", [
      "max_items",
      "group_others",
    ]),
    breakdownConfigSection(
      "appearance",
      "Chart appearance",
      "Donut/bar thickness and corner radius."
    ),
    breakdownConfigSection(
      "energy-dashboard",
      "Energy dashboard sync",
      "Bind the card to the energy dashboard's selected period.",
      ["energy_date_selection", "collection_key"]
    ),
    breakdownConfigSection(
      "entity-options",
      "Entity options",
      "Per-entity name, color, icon, multiplier, actions."
    ),
    breakdownConfigSection("actions", "Actions", "tap_action, hold_action, double_tap_action."),
  ];
}

const breakdownConfigOption = (
  name: string,
  description: string,
  sectionId = "card-options",
  extraKeywords?: string[]
): SearchEntry => ({
  title: name,
  description,
  to: `${BREAKDOWN_BASE}/configuration#${sectionId}`,
  breadcrumb: `${BREAKDOWN} → Configuration`,
  card: "breakdown",
  type: "option",
  keywords: extraKeywords,
});

function breakdownConfigOptions(): SearchEntry[] {
  return [
    breakdownConfigOption("type", "Card type identifier (required)."),
    breakdownConfigOption(
      "entities",
      "Array of energy sources to display (required).",
      "entity-options"
    ),
    breakdownConfigOption("title", "Optional card title."),
    breakdownConfigOption("chart_type", "Visual variant: bar or donut.", "card-options", [
      "donut",
      "bar",
    ]),
    breakdownConfigOption("show_legend", "Show or hide the legend.", "display"),
    breakdownConfigOption("legend_position", "bottom or right (donut only).", "display"),
    breakdownConfigOption("show_tooltip", "Show tooltip on hover/tap.", "display"),
    breakdownConfigOption("show_total", "Show total in donut center / bar header.", "display"),
    breakdownConfigOption(
      "show_legend_value",
      "Show formatted value in each legend row.",
      "display"
    ),
    breakdownConfigOption(
      "show_legend_percentage",
      "Show percentage in each legend row.",
      "display"
    ),
    breakdownConfigOption("show_icons", "Show entity icons in the legend.", "display"),
    breakdownConfigOption("sort", "Sort segments by value, descending.", "data"),
    breakdownConfigOption("max_items", "Show only the top N largest sources.", "data"),
    breakdownConfigOption(
      "group_others",
      "Bundle remaining entities into an 'Other' segment.",
      "data"
    ),
    breakdownConfigOption("decimals", "Default decimals for formatted values.", "data"),
    breakdownConfigOption(
      "unit_of_measurement",
      "Fallback unit for entities without a unit.",
      "data"
    ),
    breakdownConfigOption("donut_thickness", "Donut ring thickness in px.", "appearance"),
    breakdownConfigOption("bar_thickness", "Bar height in px.", "appearance"),
    breakdownConfigOption("section_radius", "Corner radius for chart segments.", "appearance"),
    breakdownConfigOption(
      "energy_date_selection",
      "Use statistics growth for the energy dashboard's selected period.",
      "energy-dashboard"
    ),
    breakdownConfigOption(
      "collection_key",
      "Bind to a specific energy collection.",
      "energy-dashboard"
    ),
    breakdownConfigOption("color", "Per-entity color override.", "entity-options"),
    breakdownConfigOption("icon", "Per-entity MDI icon.", "entity-options"),
    breakdownConfigOption("name", "Per-entity name override.", "entity-options"),
    breakdownConfigOption(
      "multiplier",
      "Multiply the raw value (e.g. Wh → kWh).",
      "entity-options"
    ),
    breakdownConfigOption("tap_action", "Action triggered on tap.", "actions"),
    breakdownConfigOption("hold_action", "Action triggered on long press.", "actions"),
    breakdownConfigOption("double_tap_action", "Action triggered on double tap.", "actions"),
  ];
}

const breakdownExample = (id: string, title: string, description: string): SearchEntry => ({
  title,
  description,
  to: `${BREAKDOWN_BASE}/examples#${id}`,
  breadcrumb: `${BREAKDOWN} → Examples`,
  card: "breakdown",
  type: "example",
});

function breakdownExamples(): SearchEntry[] {
  return [
    breakdownExample("minimal", "Minimal (bar)", "Smallest config — just a list of entities."),
    breakdownExample("donut", "Donut with right legend", "Donut variant with custom colors."),
    breakdownExample("grouped-others", "Top sources with Other", "max_items + group_others."),
    breakdownExample(
      "energy-dashboard",
      "Sync to energy dashboard period",
      "energy_date_selection: true."
    ),
    breakdownExample(
      "multi-dashboard",
      "Multiple energy dashboards",
      "Use collection_key to pick one."
    ),
    breakdownExample("full-config", "Mix & match", "Reference config showing many options."),
  ];
}

function sortablePages(): SearchEntry[] {
  return [
    {
      title: "Overview",
      description: `What ${SORTABLE} is and what it can do.`,
      to: SORTABLE_BASE,
      breadcrumb: SORTABLE,
      card: "sortable",
      type: "page",
      keywords: ["intro", "drag", "drop", "reorder", "sortable", "list", "hems", "priority"],
    },
    {
      title: "Installation",
      description: "Marketplace, HACS custom repository and manual installation instructions.",
      to: `${SORTABLE_BASE}/installation`,
      breadcrumb: SORTABLE,
      card: "sortable",
      type: "page",
      keywords: [
        "marketplace",
        "hacs",
        "custom repository",
        "install",
        "resource",
        "lovelace",
        "input_text",
      ],
    },
    {
      title: "Configuration",
      description: "Full reference of every option.",
      to: `${SORTABLE_BASE}/configuration`,
      breadcrumb: SORTABLE,
      card: "sortable",
      type: "page",
      keywords: ["yaml", "options", "reference"],
    },
    {
      title: "Examples",
      description: "Copy-pastable configs, including the HEMS priority list.",
      to: `${SORTABLE_BASE}/examples`,
      breadcrumb: SORTABLE,
      card: "sortable",
      type: "page",
      keywords: ["yaml", "snippet", "minimal", "hems"],
    },
  ];
}

const sortableConfigSection = (
  id: string,
  title: string,
  description: string,
  keywords?: string[]
): SearchEntry => ({
  title,
  description,
  to: `${SORTABLE_BASE}/configuration#${id}`,
  breadcrumb: `${SORTABLE} → Configuration`,
  card: "sortable",
  type: "section",
  keywords,
});

function sortableConfigSections(): SearchEntry[] {
  return [
    sortableConfigSection(
      "card-options",
      "Card options",
      "Type, items, read-back entity, and value format.",
      ["value_format", "csv", "json"]
    ),
    sortableConfigSection(
      "display",
      "Display",
      "Drag handle, arrow buttons, rank number, and entity state."
    ),
    sortableConfigSection(
      "save-action",
      "Save action",
      "Persist the order through any service call.",
      ["service", "placeholder", "value"]
    ),
    sortableConfigSection("item-options", "Item options", "Per-item key, entity, name, and icon."),
  ];
}

const sortableConfigOption = (
  name: string,
  description: string,
  sectionId = "card-options",
  extraKeywords?: string[]
): SearchEntry => ({
  title: name,
  description,
  to: `${SORTABLE_BASE}/configuration#${sectionId}`,
  breadcrumb: `${SORTABLE} → Configuration`,
  card: "sortable",
  type: "option",
  keywords: extraKeywords,
});

function sortableConfigOptions(): SearchEntry[] {
  return [
    sortableConfigOption("type", "Card type identifier (required)."),
    sortableConfigOption("items", "The list rows (required).", "item-options"),
    sortableConfigOption("entity", "Entity whose state holds the current order (optional)."),
    sortableConfigOption("value_format", "Store the order as csv or json.", "card-options", [
      "csv",
      "json",
    ]),
    sortableConfigOption("title", "Optional card title."),
    sortableConfigOption("show_handle", "Show the drag handle on each row.", "display"),
    sortableConfigOption("show_arrows", "Show the up/down arrow buttons.", "display"),
    sortableConfigOption("show_rank", "Show the position number on each row.", "display"),
    sortableConfigOption("show_state", "Show the entity state as secondary text.", "display"),
    sortableConfigOption("save_action", "Service called on every reorder.", "save-action", [
      "service",
      "script",
    ]),
    sortableConfigOption(
      "key",
      "Stable id stored in the order (defaults to entity).",
      "item-options"
    ),
    sortableConfigOption("icon", "Per-item MDI icon override.", "item-options"),
    sortableConfigOption("name", "Per-item label override.", "item-options"),
  ];
}

const sortableExample = (id: string, title: string, description: string): SearchEntry => ({
  title,
  description,
  to: `${SORTABLE_BASE}/examples#${id}`,
  breadcrumb: `${SORTABLE} → Examples`,
  card: "sortable",
  type: "example",
});

function sortableExamples(): SearchEntry[] {
  return [
    sortableExample("minimal", "Minimal (CSV input_text)", "Smallest config storing a CSV value."),
    sortableExample(
      "hems",
      "HEMS load priority",
      "Order battery, EV, heating for energy management."
    ),
    sortableExample(
      "entity-backed",
      "Entity-backed rows + script",
      "Pull name/icon/state, save as JSON."
    ),
    sortableExample(
      "custom-service",
      "Write-only via a custom service",
      "No entity, fire a service on change."
    ),
    sortableExample("bare", "Bare list", "Hide the handle, arrows, and rank."),
  ];
}

const periodEntry = (
  to: string,
  breadcrumb: string,
  type: SearchEntry["type"],
  title: string,
  description: string,
  keywords?: string[]
): SearchEntry => ({ title, description, to, breadcrumb, card: "period", type, keywords });

function periodPages(): SearchEntry[] {
  return [
    periodEntry(PERIOD_BASE, PERIOD, "page", "Overview", `What ${PERIOD} is and what it can do.`, [
      "date",
      "period",
      "picker",
      "selector",
      "energy collection",
    ]),
    periodEntry(
      `${PERIOD_BASE}/installation`,
      PERIOD,
      "page",
      "Installation",
      "Marketplace, HACS custom repository and manual installation instructions.",
      ["marketplace", "hacs", "custom repository", "install", "resource", "lovelace"]
    ),
    periodEntry(
      `${PERIOD_BASE}/configuration`,
      PERIOD,
      "page",
      "Configuration",
      "Full reference of every option.",
      ["yaml", "options", "reference"]
    ),
    periodEntry(
      `${PERIOD_BASE}/examples`,
      PERIOD,
      "page",
      "Examples",
      "Copy-pastable configs, including one paired with Energy Flow Card Plus.",
      ["yaml", "snippet", "vertical-stack"]
    ),
  ];
}

const periodSection = (id: string, title: string, description: string) =>
  periodEntry(
    `${PERIOD_BASE}/configuration#${id}`,
    `${PERIOD} → Configuration`,
    "section",
    title,
    description
  );

function periodConfigSections(): SearchEntry[] {
  return [
    periodSection("card-options", "Card options", "Card background, title and energy collection."),
    periodSection("buttons", "Buttons", "Period buttons, previous/next, today and the calendar."),
    periodSection("compare", "Compare", "Compare with the previous period."),
  ];
}

const periodOption = (name: string, description: string, sectionId: string, keywords?: string[]) =>
  periodEntry(
    `${PERIOD_BASE}/configuration#${sectionId}`,
    `${PERIOD} → Configuration`,
    "option",
    name,
    description,
    keywords
  );

function periodConfigOptions(): SearchEntry[] {
  return [
    periodOption("card_background", "Show the selector on a card.", "card-options"),
    periodOption("title", "Card title, with card_background.", "card-options"),
    periodOption("collection_key", "Drive another energy collection.", "card-options", [
      "dashboard",
    ]),
    periodOption("period_buttons", "Period buttons and their order.", "buttons", [
      "day",
      "week",
      "month",
      "year",
      "custom",
    ]),
    periodOption("custom_period_label", "Label of the custom button.", "buttons"),
    periodOption("prev_next_buttons", "Show the previous and next buttons.", "buttons"),
    periodOption("today_button_type", "Style of the today button, or hide it.", "buttons"),
    periodOption("date_picker", "Open HA's calendar from the date in every period.", "buttons", [
      "calendar",
      "range",
    ]),
    periodOption("compare_button_type", "Show a compare button.", "compare"),
    periodOption("compare_button_label", "Label of the text compare button.", "compare"),
  ];
}

const periodExample = (id: string, title: string, description: string) =>
  periodEntry(
    `${PERIOD_BASE}/examples#${id}`,
    `${PERIOD} → Examples`,
    "example",
    title,
    description
  );

function periodExamples(): SearchEntry[] {
  return [
    periodExample("minimal", "On a card", "Default buttons on a card background."),
    periodExample("icons", "Icons, compare and custom periods", "Icon buttons and custom ranges."),
    periodExample("date-picker", "Pick any range from the date", "date_picker in every period."),
    periodExample("with-energy-flow", "With Energy Flow Card Plus", "Drive energy_date_selection."),
  ];
}

const houseEntry = (
  to: string,
  breadcrumb: string,
  type: SearchEntry["type"],
  title: string,
  description: string,
  keywords?: string[]
): SearchEntry => ({ title, description, to, breadcrumb, card: "house", type, keywords });

function houseEntries(): SearchEntry[] {
  const configuration = `${HOUSE} → Configuration`;
  const option = (name: string, description: string, sectionId: string, keywords?: string[]) =>
    houseEntry(
      `${HOUSE_BASE}/configuration#${sectionId}`,
      configuration,
      "option",
      name,
      description,
      keywords
    );
  const example = (id: string, title: string, description: string) =>
    houseEntry(
      `${HOUSE_BASE}/examples#${id}`,
      `${HOUSE} → Examples`,
      "example",
      title,
      description
    );
  return [
    houseEntry(HOUSE_BASE, HOUSE, "page", "Overview", `What ${HOUSE} is and what it can do.`, [
      "isometric",
      "house",
      "solar",
      "battery",
      "inverter",
      "home",
    ]),
    houseEntry(
      `${HOUSE_BASE}#a-day`,
      HOUSE,
      "section",
      "A day on your house",
      "The card live through a day: afternoon, evening, night and a grid outage.",
      ["demo", "live", "scenario", "outage", "generator", "night", "evening"]
    ),
    houseEntry(
      `${HOUSE_BASE}/installation`,
      HOUSE,
      "page",
      "Installation",
      "Marketplace, HACS and manual installation instructions.",
      ["marketplace", "hacs", "install", "resource", "lovelace"]
    ),
    houseEntry(
      `${HOUSE_BASE}/configuration`,
      HOUSE,
      "page",
      "Configuration",
      "Every option the card reads.",
      ["yaml", "options", "reference"]
    ),
    houseEntry(`${HOUSE_BASE}/examples`, HOUSE, "page", "Examples", "Copy-pastable configs.", [
      "yaml",
      "snippet",
    ]),
    houseEntry(
      `${HOUSE_BASE}/configuration#card-options`,
      configuration,
      "section",
      "Card options",
      "Entities, title, animations."
    ),
    houseEntry(
      `${HOUSE_BASE}/configuration#numbers`,
      configuration,
      "section",
      "Numbers and pulses",
      "Decimals, kW threshold, pulse speed."
    ),
    option("animate_numbers", "Roll numbers to their new value.", "card-options", [
      "number-flow",
      "animation",
    ]),
    option("clickable_entities", "Tap a value to open its entity.", "card-options"),
    option("disable_dots", "Keep the wires still.", "card-options", ["pulses"]),
    ...(
      [
        ["grid", "Grid", "Import and export sensors, power outage, colours, actions."],
        ["solar", "Solar", "The solar sensor, name, colour, actions."],
        ["battery", "Battery", "Power and state of charge, charge bar thresholds, icon, colours."],
        ["home", "Home", "The home's own sensor and override_state."],
        ["generator", "Generator", "A generator on the inverter during a grid outage."],
        ["car", "Car", "An electric car, its charge, visibility and idle conditions."],
        ["conditions", "Conditions", "Conditions for the car's visibility and idle state."],
        ["actions", "Actions", "Tap, hold and double-tap actions on a label."],
      ] as const
    ).map(([id, title, description]) =>
      houseEntry(`${HOUSE_BASE}/configuration#${id}`, configuration, "section", title, description)
    ),
    option("wire_width", "Draw the wires thicker.", "card-options", ["lines", "thickness"]),
    option("power_outage", "The grid's outage sensor and alert.", "grid", ["outage", "blackout"]),
    option("override_state", "Show the home sensor's own reading.", "home"),
    option("visibility", "When the car is drawn.", "car", ["car", "conditions", "home"]),
    option("idle", "When the car is parked and unplugged.", "car", ["car", "plugged", "faded"]),
    option("generator", "A generator on the inverter during a grid outage.", "generator", [
      "outage",
      "backup",
    ]),
    option("state_of_charge_severity", "Battery charge bar colours.", "battery", [
      "battery",
      "red",
      "yellow",
      "threshold",
    ]),
    option("state_of_charge_position", "Where the battery label shows its charge.", "battery", [
      "battery",
      "inline",
      "swap",
      "percent",
    ]),
    option("kilo_threshold", "From how many watts values are in kW.", "numbers"),
    option("kilo_decimals", "Decimals of values in kW.", "numbers"),
    example("solar-battery", "Solar and a battery", "The full house."),
    example(
      "split",
      "Separate sensors, an outage and a generator",
      "Split entities, the grid's outage sensor and a generator."
    ),
    example(
      "thresholds",
      "Your own battery thresholds",
      "state_of_charge_severity red and yellow."
    ),
    example(
      "charge-position",
      "The state of charge beside the power",
      "state_of_charge_position after_power."
    ),
    example("grid-only", "Grid only", "No solar or battery."),
    example("wire-width", "Thicker wires", "wire_width 2."),
    example("still", "Still numbers and wires", "animate_numbers and disable_dots off."),
  ];
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
    keywords: ["vite+", "vp run", "workspace"],
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
    keywords: ["pnpm dev", "vite", "watch"],
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
    keywords: ["vite+", "oxlint", "oxfmt", "lint", "format", "typecheck", "vitest"],
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
  {
    title: "License",
    description: "flixlix-cards is released under the MIT License.",
    to: "/contributing#license",
    breadcrumb: "How to contribute",
    card: "general",
    type: "section",
    keywords: ["mit", "licence", "open source", "copyright"],
  },
];

export const SEARCH_ENTRIES: SearchEntry[] = [
  ...PAGES,
  ...cardPages("power", "/power-flow-card-plus", POWER),
  {
    title: "Playground",
    description: "Try the card live: edit the config and move the sensors.",
    to: "/power-flow-card-plus/playground",
    breadcrumb: "Power Flow Card Plus",
    card: "power",
    type: "page",
    keywords: ["demo", "live", "preview", "try", "scenario"],
  },
  {
    title: "Playground",
    description: "Try the house live: pick a moment of the day, move the sensors.",
    to: "/home-flow-card/playground",
    breadcrumb: "Home Flow Card",
    card: "house",
    type: "page",
    keywords: ["demo", "live", "preview", "try", "scenario", "outage", "generator"],
  },
  ...cardPages("energy", "/energy-flow-card-plus", ENERGY),
  {
    title: "Playground",
    description: "Try the card live under the period selector: pick a period, edit the config.",
    to: "/energy-flow-card-plus/playground",
    breadcrumb: "Energy Flow Card Plus",
    card: "energy",
    type: "page",
    keywords: ["demo", "live", "preview", "try", "scenario", "period", "date"],
  },
  {
    title: "Playground",
    description: "Try the period selector live, driving Energy Flow Card Plus.",
    to: "/energy-period-selector-plus/playground",
    breadcrumb: "Energy Period Selector Plus",
    card: "period",
    type: "page",
    keywords: ["demo", "live", "preview", "try", "period", "date", "compare"],
  },
  ...breakdownPages(),
  ...sortablePages(),
  ...periodPages(),
  ...configSections("power", "/power-flow-card-plus", POWER),
  ...configSections("energy", "/energy-flow-card-plus", ENERGY),
  ...breakdownConfigSections(),
  ...sortableConfigSections(),
  ...periodConfigSections(),
  ...configOptions("power", "/power-flow-card-plus", POWER),
  ...configOptions("energy", "/energy-flow-card-plus", ENERGY),
  ...breakdownConfigOptions(),
  ...sortableConfigOptions(),
  ...periodConfigOptions(),
  ...exampleEntries("power", "/power-flow-card-plus", POWER),
  ...exampleEntries("energy", "/energy-flow-card-plus", ENERGY),
  ...breakdownExamples(),
  ...sortableExamples(),
  ...periodExamples(),
  ...houseEntries(),
  ...CONTRIBUTING_SECTIONS,
];

/** Exact match beats prefix match beats substring match. */
function matchScore(value: string, q: string, weight: number): number {
  if (!value) {
    return 0;
  }
  if (value === q) {
    return weight * 4;
  }
  if (value.startsWith(q)) {
    return weight * 2;
  }
  return value.includes(q) ? weight : 0;
}

function score(query: string, entry: SearchEntry): number {
  const q = query.toLowerCase().trim();
  if (!q) {
    return 0;
  }

  const haystacks: { value: string; weight: number }[] = [
    { value: entry.title.toLowerCase(), weight: 10 },
    { value: (entry.description ?? "").toLowerCase(), weight: 4 },
    { value: entry.breadcrumb.toLowerCase(), weight: 2 },
    ...(entry.keywords ?? []).map((k) => ({ value: k.toLowerCase(), weight: 5 })),
  ];

  let total = haystacks.reduce((sum, { value, weight }) => sum + matchScore(value, q, weight), 0);

  // tokens: every word in the query must appear somewhere
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const combined = haystacks.map((h) => h.value).join(" ");
    if (tokens.every((t) => combined.includes(t))) {
      total += 6;
    } else {
      return 0;
    } // multi-word queries require all tokens to match
  }

  // boost type
  if (entry.type === "page" && total > 0) {
    total += 1;
  }

  return total;
}

export function searchDocs(query: string, max = 8): SearchEntry[] {
  const q = query.trim();
  if (!q) {
    return [];
  }
  return SEARCH_ENTRIES.map((entry) => ({ entry, s: score(q, entry) }))
    .filter(({ s }) => s > 0)
    .toSorted((a, b) => b.s - a.s)
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
      (e) => e.to === "/energy-breakdown-card" && e.type === "page",
      (e) => e.to === "/sortable-list-card" && e.type === "page",
      (e) => e.to === "/power-flow-card-plus/installation",
      (e) => e.to === "/energy-flow-card-plus/installation",
      (e) => e.to === "/energy-breakdown-card/installation",
      (e) => e.to === "/sortable-list-card/installation",
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
