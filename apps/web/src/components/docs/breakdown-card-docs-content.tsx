import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  ChartPie,
  Filter,
  Github,
  Layers,
  ListChecks,
  MousePointerClick,
  Package,
  PaintBucket,
  Settings,
  Wrench,
} from "lucide-react";
import type * as React from "react";

import { Button } from "@flixlix-cards/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flixlix-cards/ui/components/card";
import { Checkbox } from "@flixlix-cards/ui/components/checkbox";

import { CategorySection } from "./category-section";
import {
  Callout,
  CodeBlock,
  NextPageNav,
  PageHeader,
  Prose,
  Section,
  type OptionRow,
} from "./doc-primitives";
import { OptionList } from "./option-list";
import { PageTOC, type TocItem } from "./page-toc";

const TITLE = "Energy Breakdown Card";
const PKG = "energy-breakdown-card";
const CARD_TYPE = "custom:energy-breakdown-card";
const BASE_PATH = "/energy-breakdown-card";
const REPO_URL = "https://github.com/flixlix/energy-breakdown-card";
const HACS_REDIRECT =
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=energy-breakdown-card&category=Dashboard";
const RELEASE_URL = "https://github.com/flixlix/energy-breakdown-card/releases/latest";

function HighlightItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="bg-muted/40 flex items-center gap-2 rounded-md border p-3">
      <Checkbox className="pointer-events-none" checked />
      {children}
    </li>
  );
}

// ---------- Overview ----------

export function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Overview"
        description="A custom Home Assistant Lovelace card that visualizes how your energy use is broken down across sources — as a donut or stacked bar."
        badges={[{ label: "HACS custom" }, { label: "YAML & UI editor" }, { label: "Donut + bar" }]}
      />

      <Prose className="mt-4">
        <p>
          <strong>{TITLE}</strong> turns a list of energy sensors into a clean proportional chart.
          It is designed to fit the design language of the latest Lovelace UI: rounded corners, soft
          shadows, HA color tokens, and a quiet visual presence that adapts to your theme.
        </p>
        <p>
          <strong>Scope.</strong> This card displays accumulated energy values (Wh / kWh) and shows
          how a total is split across sources. For an animated flow diagram between grid, solar,
          battery and home use the <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link>{" "}
          instead.
        </p>
      </Prose>

      <Section title="Highlights">
        <ul className="text-foreground/90 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <HighlightItem>Two visual variants — donut and stacked bar</HighlightItem>
          <HighlightItem>Optional legend with names, values, and percentages</HighlightItem>
          <HighlightItem>Mobile-friendly tooltip on tap, desktop hover tooltip</HighlightItem>
          <HighlightItem>Per-entity color, icon, name, multiplier, and actions</HighlightItem>
          <HighlightItem>
            <code>group_others</code> + <code>max_items</code> to keep the chart readable
          </HighlightItem>
          <HighlightItem>Optional sync to the Home Assistant energy dashboard period</HighlightItem>
        </ul>
      </Section>

      <Section title="What's in this section">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" /> Installation
              </CardTitle>
              <CardDescription>HACS custom repository or manual install.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={`${BASE_PATH}/installation`}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4" /> Configuration
              </CardTitle>
              <CardDescription>Every option, with defaults and types.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={`${BASE_PATH}/configuration`}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-4" /> Examples
              </CardTitle>
              <CardDescription>Copy-pastable configs for common setups.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={`${BASE_PATH}/examples`}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Source &amp; releases">
        <Prose>
          <p>
            The card is distributed via{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              flixlix/energy-breakdown-card
            </a>
            , but the source code lives in the monorepo at{" "}
            <a
              href="https://github.com/flixlix/flixlix-cards"
              target="_blank"
              rel="noopener noreferrer"
            >
              flixlix/flixlix-cards
            </a>
            . Issues and feature requests are tracked there.
          </p>
        </Prose>
        <Button asChild variant="outline" size="sm">
          <a
            href="https://github.com/flixlix/flixlix-cards"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-4" /> View source on GitHub
          </a>
        </Button>
      </Section>

      <NextPageNav next={{ label: "Installation", to: `${BASE_PATH}/installation` }} />
    </>
  );
}

// ---------- Installation ----------

export function InstallationPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Installation"
        description="This card is not yet in the default HACS store — you need to add it as a custom repository first. Manual installation is also supported."
      />

      <Callout variant="info" title="Custom repository required">
        Unlike the Power and Energy Flow cards, <strong>{TITLE}</strong> is not part of the default
        HACS index yet. Add the repository URL below as a <em>Custom repository</em> in HACS to
        install it.
      </Callout>

      <Section title="HACS (custom repository)" id="hacs">
        <Prose>
          <ol>
            <li>
              In Home Assistant, open <strong>HACS</strong>.
            </li>
            <li>
              Click the <strong>⋮</strong> menu in the top-right and choose{" "}
              <strong>Custom repositories</strong>.
            </li>
            <li>
              Add the repository URL <code>{REPO_URL}</code> with category{" "}
              <strong>Dashboard</strong>, then click <strong>Add</strong>.
            </li>
            <li>
              Search for <strong>{TITLE}</strong> in HACS and click <strong>Download</strong>.
            </li>
            <li>Reload your dashboard / clear browser cache.</li>
          </ol>
          <p>
            The button below opens the repository inside HACS and pre-fills the dialog if you have{" "}
            <a href="https://my.home-assistant.io" target="_blank" rel="noopener noreferrer">
              My Home Assistant
            </a>{" "}
            set up.
          </p>
        </Prose>
        <Button asChild variant="outline" size="sm">
          <a href={HACS_REDIRECT} target="_blank" rel="noopener noreferrer">
            Open in HACS
          </a>
        </Button>
      </Section>

      <Section title="Manual installation" id="manual">
        <Prose>
          <p>
            Download <code>{PKG}.js</code> from the{" "}
            <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer">
              latest release
            </a>{" "}
            and copy it into <code>config/www/</code>.
          </p>
          <p>If you configure dashboards via YAML, register the resource:</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`lovelace:
  resources:
    - url: /local/${PKG}.js
      type: module`}
        />
        <Prose>
          <p>
            If you prefer the graphical editor: enable advanced mode in your user profile, go to{" "}
            <strong>Settings → Dashboards → ⋮ → Resources</strong>, click <em>Add resource</em> and
            paste:
          </p>
        </Prose>
        <CodeBlock language="text" code={`/local/${PKG}.js`} />
        <Callout variant="tip" title="HACS users">
          When installed via HACS the path becomes{" "}
          <code>
            /hacsfiles/{PKG}/{PKG}.js
          </code>
          . HACS usually registers it automatically.
        </Callout>
      </Section>

      <Section title="Verify the install" id="verify">
        <Prose>
          <ol>
            <li>Reload your browser cache (hard refresh).</li>
            <li>
              Edit a dashboard and click <strong>Add card → Custom: {TITLE}</strong>.
            </li>
            <li>Use the UI editor or paste the minimal config below.</li>
          </ol>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
chart_type: bar
entities:
  - entity: sensor.solar_energy_today
  - entity: sensor.grid_energy_today
  - entity: sensor.battery_energy_today`}
        />
      </Section>

      <NextPageNav
        prev={{ label: "Overview", to: BASE_PATH }}
        next={{ label: "Configuration", to: `${BASE_PATH}/configuration` }}
      />
    </>
  );
}

// ---------- Configuration option groups ----------

const CARD_OPTIONS: OptionRow[] = [
  {
    name: "type",
    type: "string",
    required: true,
    description: <code>{CARD_TYPE}</code>,
  },
  {
    name: "entities",
    type: "array",
    required: true,
    description: (
      <>
        List of energy sources to display. Each item is documented in the{" "}
        <a href="#entity-options">Entity options</a> section.
      </>
    ),
  },
  {
    name: "chart_type",
    type: "string",
    default: "bar",
    description: (
      <>
        Visual variant. One of <code>bar</code> (stacked progress bar) or <code>donut</code> (ring
        chart).
      </>
    ),
  },
  { name: "title", type: "string", description: "Optional card title shown above the chart." },
];

const DISPLAY_OPTIONS: OptionRow[] = [
  {
    name: "show_legend",
    type: "boolean",
    default: "true",
    description: "Show the legend with names and values.",
  },
  {
    name: "legend_position",
    type: "string",
    default: "bottom",
    description: (
      <>
        Where to place the legend. One of <code>bottom</code> or <code>right</code>. Donut only —
        bar chart always renders the legend below.
      </>
    ),
  },
  {
    name: "show_tooltip",
    type: "boolean",
    default: "true",
    description: "Show a tooltip on hover/tap of a segment.",
  },
  {
    name: "show_total",
    type: "boolean",
    default: "true",
    description: "Show the total in the center of the donut, or above the bar.",
  },
  {
    name: "show_legend_value",
    type: "boolean",
    default: "true",
    description: "Show the formatted value in each legend row.",
  },
  {
    name: "show_legend_percentage",
    type: "boolean",
    default: "true",
    description: "Show the percentage in each legend row.",
  },
  {
    name: "show_icons",
    type: "boolean",
    default: "true",
    description: "Show entity icons next to legend rows.",
  },
];

const DATA_OPTIONS: OptionRow[] = [
  {
    name: "sort",
    type: "boolean",
    default: "true",
    description: "Sort segments by value, descending.",
  },
  {
    name: "max_items",
    type: "number",
    description: "Show only the top N largest sources. Leave unset to show all entities.",
  },
  {
    name: "group_others",
    type: "boolean",
    default: "true",
    description: (
      <>
        When <code>max_items</code> is set, bundle the remaining entities into a single{" "}
        <em>Other</em> segment. Set to <code>false</code> to drop them entirely.
      </>
    ),
  },
  {
    name: "decimals",
    type: "number",
    description: "Default decimals for formatted values. Auto-scaled by magnitude when unset.",
  },
  {
    name: "unit_of_measurement",
    type: "string",
    description: "Fallback unit for entities that do not expose a unit attribute.",
  },
];

const APPEARANCE_OPTIONS: OptionRow[] = [
  {
    name: "donut_thickness",
    type: "number",
    default: "22",
    description: "Donut ring thickness in px (donut only).",
  },
  {
    name: "bar_thickness",
    type: "number",
    default: "18",
    description: "Bar height in px (bar only).",
  },
  {
    name: "section_radius",
    type: "number",
    default: "thickness/2",
    description:
      "Corner radius for sections. On donut, capped to half the ring thickness; on bar, treated as a pixel radius.",
  },
];

const ENERGY_OPTIONS: OptionRow[] = [
  {
    name: "energy_date_selection",
    type: "boolean",
    default: "false",
    description: (
      <>
        When <code>true</code>, values come from the energy dashboard's selected date range
        (statistics growth). When <code>false</code>, the entity's current state is used directly.
      </>
    ),
  },
  {
    name: "collection_key",
    type: "string",
    description: (
      <>
        Bind this card to a specific Home Assistant energy collection (e.g.{" "}
        <code>energy_living_room</code>). Useful when multiple energy dashboards exist. Defaults to
        the active dashboard's collection.
      </>
    ),
  },
];

const ENTITY_OPTIONS: OptionRow[] = [
  { name: "entity", type: "string", required: true, description: "The Home Assistant entity ID." },
  {
    name: "name",
    type: "string",
    description: "Override the entity's friendly name in the legend and tooltip.",
  },
  {
    name: "color",
    type: "string",
    description: (
      <>
        CSS color (HEX, RGB, or <code>var(...)</code>). Defaults to a smart palette based on the
        entity name (solar, grid, battery, …).
      </>
    ),
  },
  { name: "icon", type: "string", description: "MDI icon shown next to the entity in the legend." },
  {
    name: "unit_of_measurement",
    type: "string",
    description: "Override the entity's unit of measurement.",
  },
  {
    name: "decimals",
    type: "number",
    description: "Override the number of decimals for this specific entity.",
  },
  {
    name: "multiplier",
    type: "number",
    default: "1",
    description: "Multiply the raw value (useful to convert Wh → kWh, etc.).",
  },
  {
    name: "tap_action",
    type: "object",
    description: (
      <>
        Action triggered on tap. Defaults to <code>more-info</code> for the entity.
      </>
    ),
  },
  { name: "hold_action", type: "object", description: "Action triggered on long-press." },
  { name: "double_tap_action", type: "object", description: "Action triggered on double-tap." },
];

function ConfigShortcut({
  to,
  icon: Icon,
  label,
  hint,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  accent: string;
}) {
  return (
    <a
      href={to}
      className="group bg-card hover:border-foreground/20 flex items-start gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${accent}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-foreground text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">{hint}</div>
      </div>
    </a>
  );
}

// ---------- Configuration ----------

export function ConfigurationPage() {
  const tocItems: TocItem[] = [
    { id: "card-options", label: "Card options" },
    { id: "display", label: "Legend & tooltip" },
    { id: "data", label: "Data shaping" },
    { id: "appearance", label: "Chart appearance" },
    { id: "energy-dashboard", label: "Energy dashboard sync" },
    { id: "entity-options", label: "Entity options" },
    { id: "actions", label: "Actions" },
  ];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-10">
      <div className="min-w-0">
        <PageHeader
          eyebrow={TITLE}
          title="Configuration"
          description={
            <>
              Every option, what it does, and how to use it. Required fields are marked with{" "}
              <span className="text-destructive font-mono">*</span>.
            </>
          }
        />

        <Callout variant="tip" title="In a hurry?">
          The <Link to={`${BASE_PATH}/examples`}>Examples</Link> page has minimal configs you can
          paste straight into your dashboard. Come back here to fine-tune.
        </Callout>

        <div className="my-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigShortcut
            to="#card-options"
            icon={Settings}
            label="Card options"
            hint="Type, title, chart variant"
            accent="bg-slate-500/10 text-slate-700 dark:text-slate-300"
          />
          <ConfigShortcut
            to="#display"
            icon={ListChecks}
            label="Legend & tooltip"
            hint="Visibility and position"
            accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          />
          <ConfigShortcut
            to="#data"
            icon={Filter}
            label="Data shaping"
            hint="Sort, group, decimals"
            accent="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          />
          <ConfigShortcut
            to="#appearance"
            icon={PaintBucket}
            label="Chart appearance"
            hint="Thickness and corner radius"
            accent="bg-pink-500/10 text-pink-700 dark:text-pink-300"
          />
          <ConfigShortcut
            to="#energy-dashboard"
            icon={CalendarRange}
            label="Energy dashboard"
            hint="Sync to selected period"
            accent="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
          />
          <ConfigShortcut
            to="#entity-options"
            icon={Layers}
            label="Per-entity options"
            hint="Name, color, icon, actions"
            accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          />
        </div>

        <CategorySection
          id="card-options"
          title="Card options"
          icon={Settings}
          accent="slate"
          description="Top-level card configuration — type, chart variant, title, and the entities list."
          example={{
            language: "yaml",
            code: `type: ${CARD_TYPE}
title: Energy Breakdown
chart_type: donut
entities:
  - entity: sensor.solar_energy_today
  - entity: sensor.grid_energy_today
  - entity: sensor.battery_energy_today`,
          }}
        >
          <OptionList rows={CARD_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="display"
          title="Legend & tooltip"
          icon={ChartPie}
          accent="blue"
          description="Toggle and position the legend, tooltip, total, and icons."
          intro={
            <Prose>
              <p>
                <strong>Desktop:</strong> hovering a segment opens a tooltip near the cursor that
                tracks the cursor and disappears on leave.
              </p>
              <p>
                <strong>Mobile:</strong> tapping a segment opens the tooltip and pins it; tapping
                the same segment again fires its <code>tap_action</code> (or <code>more-info</code>
                ); tapping outside dismisses it.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `chart_type: donut
show_legend: true
legend_position: right
show_tooltip: true
show_total: true
show_legend_value: true
show_legend_percentage: true
show_icons: true`,
          }}
        >
          <OptionList rows={DISPLAY_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="data"
          title="Data shaping"
          icon={Filter}
          accent="violet"
          description="Sort, group, and format the values that feed the chart."
          intro={
            <Prose>
              <p>
                Use <code>max_items</code> together with <code>group_others</code> to keep the chart
                readable when you have many low-magnitude sources.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `sort: true
max_items: 5
group_others: true
decimals: 1
unit_of_measurement: kWh`,
          }}
        >
          <OptionList rows={DATA_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="appearance"
          title="Chart appearance"
          icon={PaintBucket}
          accent="pink"
          description="Tune the visual proportions of each chart variant."
          intro={
            <Prose>
              <p>
                <code>donut_thickness</code> applies only to <code>chart_type: donut</code>;{" "}
                <code>bar_thickness</code> only to <code>chart_type: bar</code>.{" "}
                <code>section_radius</code> works on both.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `chart_type: bar
bar_thickness: 24
section_radius: 12`,
          }}
        >
          <OptionList rows={APPEARANCE_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="energy-dashboard"
          title="Energy dashboard sync"
          icon={CalendarRange}
          accent="cyan"
          description="Optionally bind the card to the Home Assistant energy dashboard, so values follow the dashboard's selected date range."
          intro={
            <Prose>
              <p>
                With <code>energy_date_selection: true</code>, the card pulls statistics growth for
                each entity over the selected period (today, week, custom range) instead of using
                the entity's current state.
              </p>
              <p>
                Each Home Assistant energy dashboard exposes its own <em>collection</em>. By default
                the card binds to the active dashboard's collection. Set <code>collection_key</code>{" "}
                to follow a specific dashboard — keys follow the pattern{" "}
                <code>energy_&lt;dashboard_url&gt;</code>.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `type: ${CARD_TYPE}
energy_date_selection: true
collection_key: energy_living_room
entities:
  - entity: sensor.solar_energy
  - entity: sensor.grid_energy
  - entity: sensor.battery_energy`,
          }}
        >
          <OptionList rows={ENERGY_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="entity-options"
          title="Entity options"
          icon={Layers}
          accent="green"
          description="Each item in the entities array supports the options below."
          intro={
            <Prose>
              <p>
                If you only specify <code>entity</code>, the card pulls the friendly name, unit, and
                icon from Home Assistant and assigns a color from a built-in palette that recognizes
                common names like <em>solar</em>, <em>grid</em>, and <em>battery</em>.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `entities:
  - entity: sensor.solar_energy_today
    name: Solar
    color: "var(--energy-solar-color)"
    icon: mdi:solar-power
  - entity: sensor.grid_energy_today
    name: Grid
    color: "#488fc2"
  - entity: sensor.battery_energy_today
    name: Battery
    icon: mdi:home-battery
    multiplier: 0.001 # Wh -> kWh`,
          }}
        >
          <OptionList rows={ENTITY_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="actions"
          title="Actions"
          icon={MousePointerClick}
          accent="amber"
          description="Per-entity click handlers. Use these to open more-info, navigate, call services, or fire scripts."
          intro={
            <Prose>
              <p>
                Each entity supports the standard{" "}
                <a
                  href="https://www.home-assistant.io/dashboards/actions/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Home Assistant action
                </a>{" "}
                objects. The default <code>tap_action</code> opens the entity's more-info dialog.
              </p>
              <p>
                On touch devices, the first tap on a segment <em>opens the tooltip</em>. The second
                tap on the same segment fires its <code>tap_action</code>.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `entities:
  - entity: sensor.solar_energy_today
    tap_action:
      action: navigate
      navigation_path: /lovelace/energy
    hold_action:
      action: more-info`,
          }}
        >
          <OptionList
            rows={[
              { name: "tap_action", type: "object", description: "Triggered on tap/click." },
              { name: "hold_action", type: "object", description: "Triggered on long press." },
              {
                name: "double_tap_action",
                type: "object",
                description: "Triggered on double tap.",
              },
            ]}
          />
        </CategorySection>

        <NextPageNav
          prev={{ label: "Installation", to: `${BASE_PATH}/installation` }}
          next={{ label: "Examples", to: `${BASE_PATH}/examples` }}
        />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
          <PageTOC items={tocItems} />
        </div>
      </aside>
    </div>
  );
}

// ---------- Examples ----------

export function ExamplesPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Examples"
        description="Copy-pastable configs for the most common setups."
      />

      <Callout variant="info" title="Don't forget!">
        These are getting-started examples. <b>Replace the entity ids with your own.</b>
      </Callout>

      <Section id="minimal" title="Minimal (bar)">
        <Prose>
          <p>
            The smallest possible config — just a list of entities, defaulting to a stacked bar.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
entities:
  - entity: sensor.solar_energy_today
  - entity: sensor.grid_energy_today
  - entity: sensor.battery_energy_today`}
        />
      </Section>

      <Section id="donut" title="Donut with right legend">
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: Energy Breakdown
chart_type: donut
legend_position: right
show_total: true
show_legend_percentage: true
entities:
  - entity: sensor.solar_energy_today
    name: Solar
    color: "var(--energy-solar-color)"
  - entity: sensor.grid_energy_today
    name: Grid
    color: "#488fc2"
  - entity: sensor.battery_energy_today
    name: Battery
    icon: mdi:home-battery`}
        />
      </Section>

      <Section id="grouped-others" title="Top sources with “Other”">
        <Prose>
          <p>
            Use <code>max_items</code> + <code>group_others</code> to keep the chart readable when
            you have many low-magnitude sources.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
chart_type: donut
sort: true
max_items: 4
group_others: true
entities:
  - entity: sensor.solar_energy_today
  - entity: sensor.grid_energy_today
  - entity: sensor.battery_energy_today
  - entity: sensor.car_energy_today
  - entity: sensor.heatpump_energy_today
  - entity: sensor.dishwasher_energy_today
  - entity: sensor.dryer_energy_today`}
        />
      </Section>

      <Section id="energy-dashboard" title="Sync to the energy dashboard period">
        <Prose>
          <p>
            With <code>energy_date_selection: true</code>, values follow the period selected on the
            energy dashboard (today, week, custom range, …) using statistics growth.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
chart_type: bar
energy_date_selection: true
entities:
  - entity: sensor.solar_energy
  - entity: sensor.grid_energy
  - entity: sensor.battery_energy`}
        />
      </Section>

      <Section id="multi-dashboard" title="Multiple energy dashboards">
        <Prose>
          <p>
            When you maintain more than one Home Assistant energy dashboard, bind this card to a
            specific dashboard's collection. Keys follow the pattern{" "}
            <code>energy_&lt;dashboard_url&gt;</code>.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
energy_date_selection: true
collection_key: energy_living_room
entities:
  - entity: sensor.solar_energy
  - entity: sensor.grid_energy
  - entity: sensor.battery_energy`}
        />
      </Section>

      <Section id="full-config" title="Mix &amp; match (full config)">
        <Prose>
          <p>
            Demonstrates many of the available options at once. You don't need most of these — this
            is a reference of what is possible.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: Energy Breakdown
chart_type: bar
show_legend: true
show_tooltip: true
show_total: true
show_legend_value: true
show_legend_percentage: true
show_icons: true
sort: true
max_items: 5
group_others: true
decimals: 1
unit_of_measurement: kWh
bar_thickness: 22
section_radius: 11
energy_date_selection: true
entities:
  - entity: sensor.solar_energy_today
    name: Solar
    color: "var(--energy-solar-color)"
    icon: mdi:solar-power
    tap_action:
      action: more-info
  - entity: sensor.grid_energy_today
    name: Grid
    color: "var(--energy-grid-consumption-color)"
  - entity: sensor.battery_energy_today
    name: Battery
    icon: mdi:home-battery
  - entity: sensor.car_energy_today
    name: EV
    icon: mdi:car-electric
    color: "#80b8ff"
  - entity: sensor.heatpump_energy_today
    name: Heat pump
    icon: mdi:heat-pump`}
        />
      </Section>

      <NextPageNav prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }} />
    </>
  );
}
