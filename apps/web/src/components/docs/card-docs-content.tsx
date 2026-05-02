import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Battery,
  BookOpen,
  Calculator,
  Cpu,
  EyeOff,
  Github,
  Home,
  Info,
  Layers,
  Leaf,
  MousePointerClick,
  Package,
  Palette,
  Settings,
  Split,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";
import * as React from "react";

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

export type CardKey = "power" | "energy";

type Variant = {
  key: CardKey;
  cardSlug: string;
  cardType: "custom:power-flow-card-plus" | "custom:energy-flow-card-plus";
  pkgName: string;
  title: string;
  tagline: string;
  unit: string;
  unitLong: string;
  unitKilo: string;
  scope: React.ReactNode;
  baseDecimalsHelp: string;
  kiloThresholdHelp: string;
  thresholdDescription: string;
  hacsRedirect: string;
  releaseUrl: string;
  basePath: "/power-flow-card-plus" | "/energy-flow-card-plus";
  previewVideo: string;
};

const VARIANTS: Record<CardKey, Variant> = {
  power: {
    key: "power",
    cardSlug: "power-flow-card-plus",
    cardType: "custom:power-flow-card-plus",
    pkgName: "power-flow-card-plus",
    title: "Power Flow Card Plus",
    tagline:
      "A highly customizable Home Assistant card visualizing the live (instantaneous) power flow between grid, solar, battery, home, and individual devices.",
    unit: "W",
    unitLong: "watts",
    unitKilo: "kW",
    scope: (
      <>
        This card displays instantaneous power values. It is not designed for accumulated energy
        values over a period; for that, use the{" "}
        <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link>.
      </>
    ),
    baseDecimalsHelp: "Decimals when watts are displayed.",
    kiloThresholdHelp: "Watts before switching to kilowatts. 0 means always kilowatts.",
    thresholdDescription:
      "Number of watts before converting to and displaying in kilowatts. Setting 0 always displays in kW.",
    hacsRedirect:
      "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=power-flow-card-plus&category=Dashboard",
    releaseUrl: "https://github.com/flixlix/power-flow-card-plus/releases/latest",
    basePath: "/power-flow-card-plus",
    previewVideo: "/videos/power-demo.mp4",
  },
  energy: {
    key: "energy",
    cardSlug: "energy-flow-card-plus",
    cardType: "custom:energy-flow-card-plus",
    pkgName: "energy-flow-card-plus",
    title: "Energy Flow Card Plus",
    tagline:
      "A highly customizable Home Assistant card visualizing the accumulated energy distribution for the dashboard's selected period.",
    unit: "Wh",
    unitLong: "watt-hours",
    unitKilo: "kWh",
    scope:
      "This card displays accumulated energy values (Wh / kWh) for the dashboard's currently selected period (today, week, custom range, etc.).",
    baseDecimalsHelp: "Decimals when watt-hours are displayed.",
    kiloThresholdHelp: "Watt-hours before switching to kilowatt-hours. 0 means always kWh.",
    thresholdDescription:
      "Number of watt-hours before converting to and displaying in kilowatt-hours. Setting 0 always displays in kWh.",
    hacsRedirect:
      "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=energy-flow-card-plus&category=Dashboard",
    releaseUrl: "https://github.com/flixlix/energy-flow-card-plus/releases/latest",
    basePath: "/energy-flow-card-plus",
    previewVideo: "/videos/energy-demo.mp4",
  },
};

function HighlightsListCheckedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="bg-muted/40 flex items-center gap-2 rounded-md border p-3">
      <Checkbox className="pointer-events-none" checked />
      {children}
    </li>
  );
}

function variant(key: CardKey): Variant {
  return VARIANTS[key];
}

// ---------- Overview ----------

export function OverviewPage({ cardKey }: { cardKey: CardKey }) {
  const v = variant(cardKey);
  return (
    <>
      <PageHeader
        eyebrow={v.title}
        title="Overview"
        description={v.tagline}
        badges={[{ label: "HACS Default" }, { label: "YAML & UI editor" }, { label: v.unitKilo }]}
      />

      <video
        key={v.previewVideo}
        controls={false}
        loop
        muted
        playsInline
        autoPlay
        aria-label={`${v.title} demo`}
        className="mx-auto w-full max-w-lg rounded-md"
      >
        <source src={v.previewVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <Prose className="mt-4">
        <p>
          <strong>{v.title}</strong> is a Home Assistant Lovelace card that draws an animated flow
          diagram between the major energy sources in your home. It is designed as a drop-in
          replacement for Home Assistant's built-in distribution card, with a long list of
          customization options for users who want full control of the visual.
        </p>
        <p>
          <strong>Scope.</strong> {v.scope}
        </p>
      </Prose>

      <Section title="Highlights">
        <ul className="text-foreground/90 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <HighlightsListCheckedItem>
            Full UI editor with subpages for each entity
          </HighlightsListCheckedItem>
          <HighlightsListCheckedItem>
            Up to 4 individual devices with custom icons & colors
          </HighlightsListCheckedItem>
          <HighlightsListCheckedItem>
            Bidirectional grid &amp; battery (split or single entity)
          </HighlightsListCheckedItem>
          <HighlightsListCheckedItem>
            Secondary info, templates, and clickable entities
          </HighlightsListCheckedItem>
          <HighlightsListCheckedItem>
            Configurable flow rate model (legacy & new)
          </HighlightsListCheckedItem>
          <HighlightsListCheckedItem>
            Translated to 14+ languages out of the box
          </HighlightsListCheckedItem>
        </ul>
      </Section>

      <Section title="What's in this section">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" /> Installation
              </CardTitle>
              <CardDescription>HACS or manual install in two minutes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={`${v.basePath}/installation`}>
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
                <Link to={`${v.basePath}/configuration`}>
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
                <Link to={`${v.basePath}/examples`}>
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
            The card is published as <code>{v.pkgName}</code> via HACS and on GitHub. Issues and
            feature requests are tracked in the{" "}
            <a
              href="https://github.com/flixlix/flixlix-cards"
              target="_blank"
              rel="noopener noreferrer"
            >
              flixlix-cards monorepo
            </a>
            .
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

      <NextPageNav next={{ label: "Installation", to: `${v.basePath}/installation` }} />
    </>
  );
}

// ---------- Installation ----------

export function InstallationPage({ cardKey }: { cardKey: CardKey }) {
  const v = variant(cardKey);
  return (
    <>
      <PageHeader
        eyebrow={v.title}
        title="Installation"
        description="HACS is the recommended way to install the card. Manual installation is also supported."
      />

      <Section title="HACS (recommended)" id="hacs">
        <Prose>
          <p>
            The card is part of the <strong>HACS Default</strong> repositories. If you don't have
            HACS yet, follow the{" "}
            <a
              href="https://hacs.xyz/docs/setup/prerequisites"
              target="_blank"
              rel="noopener noreferrer"
            >
              HACS prerequisites
            </a>
            .
          </p>
          <ol>
            <li>
              Open HACS in your Home Assistant instance and search for <strong>{v.title}</strong>.
            </li>
            <li>
              Press <strong>Download</strong> and confirm.
            </li>
            <li>
              Reload your dashboard, then add the card via the UI or paste the YAML from the{" "}
              <Link to={`${v.basePath}/examples`}>Examples</Link> page.
            </li>
          </ol>
        </Prose>
        <Button asChild variant="outline" size="sm">
          <a href={v.hacsRedirect} target="_blank" rel="noopener noreferrer">
            Open in HACS
          </a>
        </Button>
      </Section>

      <Section title="Manual installation" id="manual">
        <Prose>
          <p>
            Download <code>{v.cardSlug}.js</code> from the{" "}
            <a href={v.releaseUrl} target="_blank" rel="noopener noreferrer">
              latest release
            </a>{" "}
            and copy it into <code>config/www</code>.
          </p>
          <p>If you configure dashboards via YAML, register the resource:</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`resources:
  - url: /local/${v.cardSlug}.js
    type: module`}
        />
        <Prose>
          <p>
            If you prefer the graphical editor: enable advanced mode in your user profile, go to{" "}
            <strong>Settings → Dashboards → ⋮ → Resources</strong>, click <em>Add resource</em> and
            paste:
          </p>
        </Prose>
        <CodeBlock language="text" code={`/local/${v.cardSlug}.js`} />
        <Callout variant="tip" title="HACS users">
          When installed via HACS the path becomes{" "}
          <code>
            /hacsfiles/{v.cardSlug}/{v.cardSlug}.js
          </code>
          . HACS usually registers it automatically.
        </Callout>
      </Section>

      <Section title="Verify the install" id="verify">
        <Prose>
          <ol>
            <li>Reload your browser cache (hard refresh).</li>
            <li>
              Edit a dashboard and click <strong>Add card → Custom: {v.title}</strong>.
            </li>
            <li>Use the UI editor or paste the minimal config below.</li>
          </ol>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${v.cardType}
entities:
  grid:
    entity: sensor.grid_${cardKey === "power" ? "power" : "energy"}
  solar:
    entity: sensor.solar_${cardKey === "power" ? "power" : "energy"}`}
        />
      </Section>

      <NextPageNav
        prev={{ label: "Overview", to: v.basePath }}
        next={{ label: "Configuration", to: `${v.basePath}/configuration` }}
      />
    </>
  );
}

// ---------- Configuration ----------

const BASIC_CARD_OPTIONS = (v: Variant): OptionRow[] => [
  {
    name: "type",
    type: "string",
    default: "-",
    required: true,
    description: <code>{v.cardType}</code>,
  },
  {
    name: "entities",
    type: "object",
    required: true,
    description: (
      <>
        At least one of <code>grid</code>, <code>battery</code> or <code>solar</code> is required.
        See the entity sections below.
      </>
    ),
  },
  { name: "title", type: "string", description: "Shows a title at the top of the card." },
];

const ADVANCED_CARD_OPTIONS = (v: Variant): OptionRow[] => [
  {
    name: "dashboard_link",
    type: "string",
    description: (
      <>
        URL path to a dashboard (e.g. <code>/energy</code>), shows a button at the bottom.
      </>
    ),
  },
  {
    name: "dashboard_link_label",
    type: "string",
    description: "Override the default label of the dashboard link.",
  },
  {
    name: "kilo_decimals",
    type: "number",
    default: "1",
    description: `Decimals when ${v.unitKilo} are displayed.`,
  },
  {
    name: "base_decimals",
    type: "number",
    default: "1",
    description: v.baseDecimalsHelp,
  },
  {
    name: "kilo_threshold",
    type: "number",
    default: "0",
    description: v.thresholdDescription,
  },
  {
    name: "clickable_entities",
    type: "boolean",
    default: "false",
    description: "Open the entity's more-info dialog when clicking a circle.",
  },
  {
    name: "second_dashboard_link",
    type: "string",
    description: "Optional second dashboard link (YAML editor only).",
  },
  {
    name: "second_dashboard_link_label",
    type: "string",
    description: "Override the second dashboard link label.",
  },
  {
    name: "min_flow_rate",
    type: "number",
    default: "0.75",
    description: "Time (s) for the fastest dot to travel an entire line.",
  },
  {
    name: "max_flow_rate",
    type: "number",
    default: "6",
    description: "Time (s) for the slowest dot to travel an entire line.",
  },
  {
    name: "min_expected_power",
    type: "number",
    default: "0.01",
    description: (
      <>
        Minimum value used by the <a href="#flow-formula">new flow formula</a>.
      </>
    ),
  },
  {
    name: "max_expected_power",
    type: "number",
    default: "2000",
    description: (
      <>
        Maximum value used by the <a href="#flow-formula">new flow formula</a>.
      </>
    ),
  },
  {
    name: "display_zero_lines",
    type: "object",
    default: "{ mode: 'show' }",
    description: "Behavior for inactive lines. See Display Zero Lines below.",
  },
  {
    name: "full_size",
    type: "boolean",
    default: "false",
    description: "Experimental, make the card fill the screen in panel mode.",
  },
  { name: "style_ha_card", type: "css", description: "CSS applied to the card container." },
  { name: "style_card_content", type: "css", description: "CSS applied to the content area." },
  {
    name: "use_new_flow_rate_model",
    type: "boolean",
    default: "false",
    description: "Switch to the new (more intuitive) flow formula.",
  },
  {
    name: "sort_individual_devices",
    type: "boolean",
    default: "true",
    description: "Sort individual devices by consumption → entity id → alphabetically.",
  },
  {
    name: "allow_layout_break",
    type: "boolean",
    default: "false",
    description: "Force showing up to 4 individual devices even if they don't fit.",
  },
  ...(v.key === "energy"
    ? [
        {
          name: "collection_key",
          type: "string",
          description: (
            <>
              Bind this card to a specific Home Assistant <em>energy collection</em> (e.g.{" "}
              <code>energy_living_room</code>). Useful if you have multiple energy dashboards.
              Defaults to the active dashboard's collection.
            </>
          ),
        } satisfies OptionRow,
      ]
    : []),
];

const GRID_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string | object",
    required: true,
    description: (
      <>
        Single bidirectional sensor (negative = production, positive = consumption) or a{" "}
        <a href="#split-entities">split entities</a> object.
      </>
    ),
  },
  {
    name: "name",
    type: "string",
    default: "Grid",
    description: "Override the auto-translated label.",
  },
  {
    name: "icon",
    type: "string",
    default: "mdi:transmission-tower",
    description: "Icon shown inside the circle.",
  },
  { name: "color", type: "object", description: "Production / consumption colors." },
  {
    name: "color_icon",
    type: "string",
    default: "no_color",
    description: "color_dynamically | no_color | production | consumption",
  },
  {
    name: "display_state",
    type: "string",
    default: "two_way",
    description: "two_way | one_way | one_way_no_zero",
  },
  {
    name: "color_circle",
    type: "string",
    default: "consumption",
    description: "color_dynamically | production | consumption",
  },
  { name: "secondary_info", type: "object", description: "See Secondary Info section." },
  {
    name: "display_zero_tolerance",
    type: "number",
    default: "0",
    description:
      "States below this number are treated as zero (avoids battery-correction artifacts).",
  },
  {
    name: "power_outage",
    type: "object",
    description: "Configure power-outage behavior. See Power Outage section.",
  },
  { name: "color_value", type: "boolean", default: "true", description: "Color the value text." },
  {
    name: "invert_state",
    type: "boolean",
    default: "false",
    description: "Invert sign convention (positive = production).",
  },
];

const SOLAR_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string",
    required: true,
    description: "Sensor providing solar production.",
  },
  { name: "name", type: "string", default: "Solar", description: "Override the label." },
  { name: "icon", type: "string", default: "mdi:solar-power", description: "Solar circle icon." },
  { name: "color", type: "string", description: "HEX color for solar circle, label and lines." },
  {
    name: "color_icon",
    type: "boolean",
    default: "false",
    description: "Match icon to circle color.",
  },
  {
    name: "color_value",
    type: "boolean",
    default: "false",
    description: "Match value text to circle color.",
  },
  {
    name: "secondary_info",
    type: "object",
    description: "Secondary info displayed inside the circle.",
  },
  {
    name: "display_zero",
    type: "boolean",
    default: "true",
    description: "Show solar even when the entity is 0 / unavailable.",
  },
  {
    name: "display_zero_state",
    type: "boolean",
    default: "true",
    description: "Show value when 0.",
  },
  {
    name: "invert_state",
    type: "boolean",
    default: "false",
    description: "Invert sign convention.",
  },
];

const BATTERY_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string | object",
    required: true,
    description: "Single bidirectional sensor or split entities object.",
  },
  {
    name: "state_of_charge",
    type: "string",
    description: "Sensor providing the SoC in percent (100 = full).",
  },
  {
    name: "state_of_charge_unit",
    type: "string",
    default: "%",
    description: "Unit shown next to the SoC.",
  },
  {
    name: "state_of_charge_unit_white_space",
    type: "boolean",
    default: "true",
    description: "Whitespace between SoC value and unit.",
  },
  {
    name: "state_of_charge_decimals",
    type: "number",
    default: "0",
    description: "Decimals for the SoC.",
  },
  { name: "name", type: "string", default: "Battery", description: "Override the label." },
  {
    name: "icon",
    type: "string",
    default: "dynamic",
    description: "Defaults to a dynamic battery icon based on SoC.",
  },
  { name: "color", type: "object", description: "Production / consumption colors." },
  {
    name: "color_icon",
    type: "string",
    default: "no_color",
    description: "color_dynamically | no_color | production | consumption",
  },
  {
    name: "display_state",
    type: "string",
    default: "two_way",
    description: "two_way | one_way | one_way_no_zero",
  },
  {
    name: "color_state_of_charge_value",
    type: "string",
    default: "no_color",
    description: "color_dynamically | no_color | production | consumption",
  },
  {
    name: "color_circle",
    type: "string",
    default: "consumption",
    description: "color_dynamically | production | consumption",
  },
  { name: "color_value", type: "boolean", default: "true", description: "Color the value text." },
  {
    name: "invert_state",
    type: "boolean",
    default: "false",
    description: "Invert sign convention.",
  },
];

const HOME_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string",
    required: true,
    description:
      "Sensor for home consumption. Used only for the more-info dialog, the value is calculated from the other sources.",
  },
  { name: "name", type: "string", default: "Home", description: "Override the label." },
  { name: "icon", type: "string", default: "mdi:home", description: "Home circle icon." },
  {
    name: "color_icon",
    type: "boolean | 'solar' | 'grid' | 'battery'",
    default: "false",
    description: "Match icon to the highest source or a specific source.",
  },
  {
    name: "color_value",
    type: "boolean | 'solar' | 'grid' | 'battery'",
    default: "false",
    description: "Match value text to the highest source or a specific source.",
  },
  { name: "secondary_info", type: "object", description: "Optional secondary info." },
  {
    name: "subtract_individual",
    type: "boolean",
    default: "false",
    description: "Subtract individual devices from the home consumption value.",
  },
  {
    name: "override_state",
    type: "boolean",
    default: "false",
    description: "Use the entity state directly instead of recomputing from sources.",
  },
];

const INDIVIDUAL_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string",
    required: true,
    description: "Sensor for the individual device.",
  },
  { name: "name", type: "string", description: "Label shown above the circle." },
  { name: "icon", type: "string", description: "Icon path (e.g. mdi:car-electric)." },
  { name: "color", type: "string", description: "HEX color for circle, label and line." },
  {
    name: "color_icon",
    type: "boolean",
    default: "false",
    description: "Match icon to circle color.",
  },
  { name: "unit_of_measurement", type: "string", description: "Override the displayed unit." },
  {
    name: "inverted_animation",
    type: "boolean",
    default: "false",
    description: "Reverse the dot direction.",
  },
  { name: "secondary_info", type: "object", description: "Secondary info object." },
  {
    name: "display_zero",
    type: "boolean",
    default: "false",
    description: "Show device when state is 0.",
  },
  {
    name: "display_zero_tolerance",
    type: "number",
    default: "0",
    description: "Treat states below this number as zero.",
  },
  {
    name: "display_zero_state",
    type: "boolean",
    default: "true",
    description: "Show value when 0.",
  },
  {
    name: "color_value",
    type: "boolean",
    default: "false",
    description: "Match value text to circle color.",
  },
  { name: "decimals", type: "number", default: "0", description: "Decimals shown in the value." },
];

const FOSSIL_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string",
    required: true,
    description: "Sensor giving the fossil-fuel percentage (CO2 Signal works out of the box).",
  },
  { name: "name", type: "string", default: "Low-carbon", description: "Label above the circle." },
  { name: "icon", type: "string", default: "mdi:leaf", description: "Icon inside the circle." },
  {
    name: "color",
    type: "string",
    default: "#0f9d58",
    description: "Stroke color of circle and line.",
  },
  {
    name: "color_icon",
    type: "boolean",
    default: "false",
    description: "Color the icon with the circle color.",
  },
  {
    name: "display_zero",
    type: "boolean",
    default: "true",
    description: "Show even when the state is 0 / unavailable.",
  },
  {
    name: "display_zero_state",
    type: "boolean",
    default: "true",
    description: "Show value when 0.",
  },
  {
    name: "state_type",
    type: "string",
    default: "power",
    description: "power | percentage; what type of value the entity provides.",
  },
  {
    name: "unit_white_space",
    type: "boolean",
    default: "true",
    description: "Whitespace before the unit.",
  },
  {
    name: "calculate_flow_rate",
    type: "boolean | number",
    default: "false",
    description: "Use the flow formula or a fixed dot interval (seconds).",
  },
];

const SECONDARY_INFO_OPTIONS: OptionRow[] = [
  { name: "entity", type: "string", required: true, description: "Sensor whose state is shown." },
  {
    name: "unit_of_measurement",
    type: "string",
    description: "String unit (quote it in YAML, e.g. '%').",
  },
  { name: "icon", type: "string", description: "Optional small icon next to the value." },
  {
    name: "unit_white_space",
    type: "boolean",
    default: "true",
    description: "Whitespace before the unit.",
  },
  {
    name: "display_zero",
    type: "boolean",
    default: "false",
    description: "Show even when 0 / unavailable.",
  },
  {
    name: "display_zero_tolerance",
    type: "number",
    description: "Treat states below this number as zero.",
  },
  { name: "decimals", type: "number", description: "Decimals for the displayed value." },
  {
    name: "template",
    type: "string",
    description: "HA template, evaluated reactively. Use only if entity is unset.",
  },
  {
    name: "accept_negative",
    type: "boolean",
    default: "false",
    description: "Show negative values as-is instead of taking the absolute value.",
  },
  {
    name: "sum_total",
    type: "boolean",
    description: "On the solar bubble, sum the secondary info with the main entity.",
  },
  { name: "tap_action", type: "object", description: "Action triggered on tap." },
  { name: "hold_action", type: "object", description: "Action triggered on long press." },
  { name: "double_tap_action", type: "object", description: "Action triggered on double tap." },
];

const POWER_OUTAGE_OPTIONS: OptionRow[] = [
  {
    name: "entity",
    type: "string",
    required: true,
    description: "Entity whose state changes during a power outage.",
  },
  { name: "entity_generator", type: "string", description: "Optional generator power entity." },
  {
    name: "state_alert",
    type: "string",
    default: "on",
    description: "State value that signals an outage.",
  },
  {
    name: "icon_alert",
    type: "string",
    default: "mdi:transmission-tower-off",
    description: "Icon shown during the outage.",
  },
  {
    name: "label_alert",
    type: "string",
    description: "Text shown below the icon during the outage.",
  },
  {
    name: "calculate_flow_rate",
    type: "boolean | number",
    default: "false",
    description: "Use the formula or a fixed dot interval (seconds).",
  },
];

const DISPLAY_ZERO_LINES_OPTIONS: OptionRow[] = [
  {
    name: "mode",
    type: "string",
    default: "show",
    description: "show | hide | transparency | grey_out | custom",
  },
  {
    name: "transparency",
    type: "number",
    default: "50",
    description: "0–100, used by transparency / custom modes.",
  },
  {
    name: "grey_color",
    type: "string | number[]",
    description: "HEX or RGB array, used by grey_out / custom modes.",
  },
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

export function ConfigurationPage({ cardKey }: { cardKey: CardKey }) {
  const v = variant(cardKey);
  const basicOptions = BASIC_CARD_OPTIONS(v);
  const advancedOptions = ADVANCED_CARD_OPTIONS(v);

  const sensorSuffix = cardKey === "power" ? "power" : "energy";

  const tocItems: TocItem[] = [
    { id: "card-options", label: "Card options" },
    { id: "actions", label: "Actions" },
    { id: "entities", label: "Entities" },
    { id: "grid", label: "Grid", depth: 2 },
    { id: "solar", label: "Solar", depth: 2 },
    { id: "battery", label: "Battery", depth: 2 },
    { id: "individual", label: "Individual devices", depth: 2 },
    { id: "home", label: "Home", depth: 2 },
    { id: "fossil-fuel", label: "Fossil fuel", depth: 2 },
    { id: "shared-objects", label: "Shared objects" },
    { id: "color-object", label: "Color object", depth: 2 },
    { id: "split-entities", label: "Split entities", depth: 2 },
    { id: "secondary-info", label: "Secondary info", depth: 2 },
    { id: "power-outage", label: "Power outage", depth: 2 },
    { id: "display-zero-lines", label: "Display zero lines", depth: 2 },
    ...(cardKey === "energy" ? [{ id: "collection-key", label: "Collection key" } as TocItem] : []),
    { id: "flow-formula", label: "Flow formulas" },
  ];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-10">
      <div className="min-w-0">
        <PageHeader
          eyebrow={v.title}
          title="Configuration"
          description={
            <>
              Every option, what it does, and how to use it. Required fields are marked with{" "}
              <span className="text-destructive font-mono">*</span>. The colored section headers
              group options by which entity they apply to.
            </>
          }
        />

        <Callout variant="tip" title="In a hurry?">
          The <Link to={`${v.basePath}/examples`}>Examples</Link> page has minimal configs you can
          paste straight into your dashboard. Come back here when you want to fine-tune.
        </Callout>

        {/* Quick navigation grid */}
        <div className="my-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigShortcut
            to="#card-options"
            icon={Settings}
            label="Card options"
            hint="Title, decimals, flow rate"
            accent="bg-slate-500/10 text-slate-700 dark:text-slate-300"
          />
          <ConfigShortcut
            to="#grid"
            icon={Zap}
            label="Grid"
            hint="Bidirectional or split entity"
            accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          />
          <ConfigShortcut
            to="#solar"
            icon={Sun}
            label="Solar"
            hint="Production sensor"
            accent="bg-orange-500/10 text-orange-700 dark:text-orange-300"
          />
          <ConfigShortcut
            to="#battery"
            icon={Battery}
            label="Battery"
            hint="Charge/discharge + SoC"
            accent="bg-pink-500/10 text-pink-700 dark:text-pink-300"
          />
          <ConfigShortcut
            to="#home"
            icon={Home}
            label="Home"
            hint="Home consumption circle"
            accent="bg-primary/10 text-primary"
          />
          <ConfigShortcut
            to="#fossil-fuel"
            icon={Leaf}
            label="Low-carbon"
            hint="Fossil fuel percentage"
            accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          />
        </div>

        <CategorySection
          id="card-options"
          title="Card options"
          icon={Settings}
          accent="slate"
          description="Top-level options that affect the whole card — title, dashboard links, decimals, flow speed, and behavior toggles."
          example={{
            language: "yaml",
            code: `type: ${v.cardType}
title: My ${cardKey === "power" ? "power" : "energy"}
kilo_threshold: 1000
${cardKey === "power" ? "kilo_decimals: 1" : "kilo_decimals: 2"}
clickable_entities: true
entities:
  # ...`,
          }}
        >
          <OptionList
            rows={basicOptions}
            advanced={{
              rows: advancedOptions,
              hint: `decimals, flow rate, styling, dashboard links${
                cardKey === "energy" ? ", collection key" : ""
              }`,
            }}
          />
        </CategorySection>

        <CategorySection
          id="actions"
          title="Actions"
          icon={MousePointerClick}
          accent="slate"
          description="Per-circle click handlers. Use these to open more-info, navigate, call services, or fire scripts."
          intro={
            <Prose>
              <p>
                Requires <code>clickable_entities: true</code>.
              </p>
              <p>
                Each clickable circle supports the standard{" "}
                <a
                  href="https://www.home-assistant.io/dashboards/actions/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Home Assistant action
                </a>{" "}
                objects. If you don't configure these and have <code>clickable_entities: true</code>
                , the card falls back to opening more-info.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `entities:
  grid:
    entity: sensor.grid_${sensorSuffix}
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

        <CategorySection
          id="entities"
          title="Entities"
          icon={Layers}
          accent="slate"
          description={
            <>
              The heart of the configuration. At least one of <code>grid</code>,{" "}
              <code>battery</code> or <code>solar</code> is required. All values use{" "}
              <code>
                {v.unit}/{v.unitKilo}
              </code>{" "}
              as <code>unit_of_measurement</code> (except <code>state_of_charge</code>, which is a
              percentage).
            </>
          }
          intro={
            <Prose>
              <p>
                Each child below has its own dedicated section with all options. Pick the ones you
                need and skip the rest.
              </p>
            </Prose>
          }
        >
          <OptionList
            rows={[
              { name: "grid", type: "object", description: "See Grid below." },
              { name: "solar", type: "object", description: "See Solar below." },
              { name: "battery", type: "object", description: "See Battery below." },
              {
                name: "individual",
                type: "array",
                description: "Up to 4 individual device objects.",
              },
              { name: "home", type: "object", description: "See Home below." },
              {
                name: "fossil_fuel_percentage",
                type: "object",
                description: "Optional low-carbon / fossil-fuel circle.",
              },
            ]}
          />
        </CategorySection>

        <CategorySection
          id="grid"
          title="Grid"
          icon={Zap}
          accent="blue"
          description="The connection to the public power grid. Supports either a single bidirectional sensor or split production/consumption sensors."
          example={{
            language: "yaml",
            code: `entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
    name: Provider
    display_state: one_way
    color_circle: color_dynamically
    power_outage:
      entity: binary_sensor.grid_status`,
          }}
        >
          <OptionList rows={GRID_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="solar"
          title="Solar"
          icon={Sun}
          accent="orange"
          description="Solar production. A single sensor giving the current solar output is enough."
          example={{
            language: "yaml",
            code: `entities:
  solar:
    entity: sensor.solar_${sensorSuffix === "energy" ? "energy" : "production"}
    name: PV
    icon: mdi:solar-panel-large
    color_icon: true
    display_zero: true`,
          }}
        >
          <OptionList rows={SOLAR_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="battery"
          title="Battery"
          icon={Battery}
          accent="pink"
          example={{
            language: "yaml",
            code: `entities:
  battery:
    entity:
      consumption: sensor.battery_consumption
      production: sensor.battery_production
    state_of_charge: sensor.battery_soc
    state_of_charge_decimals: 0
    display_state: one_way
    color_circle: color_dynamically`,
          }}
        >
          <OptionList rows={BATTERY_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="individual"
          title="Individual devices"
          icon={Cpu}
          accent="cyan"
          description={
            <>
              As many as you want, up to four individual devices are shown. <br />
              EVs, heat pumps, ovens, anything you'd like to call out.
            </>
          }
          intro={
            <Prose>
              <p>
                <code>individual</code> is an <strong>array</strong> of device objects. Each appears
                as an extra circle on the card. The structure below documents the fields each item
                accepts.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `entities:
  individual:
    - entity: sensor.car_${sensorSuffix}
      name: EV
      icon: mdi:car-electric
      color: "#80b8ff"
      color_icon: true
    - entity: sensor.heatpump_${sensorSuffix}
      name: Heat pump
      icon: mdi:heat-pump
      display_zero: true`,
          }}
        >
          <OptionList rows={INDIVIDUAL_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="home"
          title="Home"
          icon={Home}
          accent="primary"
          description="The receiving circle. Its value is computed from the other sources by default — you only need an entity for the more-info dialog."
          example={{
            language: "yaml",
            code: `entities:
  home:
    entity: sensor.home_consumption
    name: Casa
    color_icon: solar
    subtract_individual: true`,
          }}
        >
          <OptionList rows={HOME_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="fossil-fuel"
          title="Fossil fuel / low-carbon"
          icon={Leaf}
          accent="green"
          description="Show the percentage of low-carbon energy on the grid (e.g. from the CO2 Signal integration)."
          example={{
            language: "yaml",
            code: `entities:
  fossil_fuel_percentage:
    entity: sensor.fossil_fuel_percentage
    state_type: power
    display_zero: true
    color_icon: true
    name: Non-fossil`,
          }}
        >
          <OptionList rows={FOSSIL_OPTIONS} />
        </CategorySection>

        <h2
          id="shared-objects"
          className="text-foreground/80 mb-4 mt-12 scroll-mt-24 text-xs font-semibold uppercase tracking-widest"
        >
          Shared objects
        </h2>

        <CategorySection
          id="color-object"
          title="Color object"
          icon={Palette}
          accent="violet"
          description="Used by Grid and Battery to specify a separate color for production and consumption."
          example={{
            language: "yaml",
            code: `entities:
  grid:
    entity: sensor.grid_${sensorSuffix}
    color:
      consumption: "#488fc2"
      production: "#8353d1"`,
          }}
        >
          <OptionList
            rows={[
              { name: "production", type: "string", description: "HEX color for production." },
              { name: "consumption", type: "string", description: "HEX color for consumption." },
            ]}
          />
        </CategorySection>

        <CategorySection
          id="split-entities"
          title="Split entities"
          icon={Split}
          accent="slate"
          description="Use this on Grid or Battery when production and consumption come from separate sensors. Both must share a compatible unit_of_measurement."
          example={{
            language: "yaml",
            code: `entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production`,
          }}
        >
          <OptionList
            rows={[
              { name: "consumption", type: "string", description: "Sensor for consumption." },
              { name: "production", type: "string", description: "Sensor for production." },
            ]}
          />
        </CategorySection>

        <CategorySection
          id="secondary-info"
          title="Secondary info"
          icon={Info}
          accent="slate"
          description="Adds a small extra value next to a circle. Great for an EV's SoC, a daily total, or a templated string."
          example={{
            language: "yaml",
            code: `entities:
  individual:
    - entity: sensor.car_${sensorSuffix}
      secondary_info:
        entity: sensor.car_soc
        unit_of_measurement: "%"
        decimals: 0
        icon: mdi:battery`,
          }}
        >
          <OptionList rows={SECONDARY_INFO_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="power-outage"
          title="Power outage"
          icon={AlertTriangle}
          accent="amber"
          description="Detect a grid outage and react: switch the icon, show a label, override the flow rate, optionally include a generator entity."
          example={{
            language: "yaml",
            code: `entities:
  grid:
    entity: sensor.grid_${sensorSuffix}
    power_outage:
      entity: binary_sensor.grid_status
      state_alert: "off"
      icon_alert: mdi:flash-off
      label_alert: Outage`,
          }}
        >
          <OptionList rows={POWER_OUTAGE_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="display-zero-lines"
          title="Display zero lines"
          icon={EyeOff}
          accent="slate"
          description="What to do with lines whose value is 0 — keep them visible, hide them, or fade them out."
          example={{
            language: "yaml",
            code: `display_zero_lines:
  mode: transparency
  transparency: 60`,
          }}
        >
          <OptionList rows={DISPLAY_ZERO_LINES_OPTIONS} />
        </CategorySection>

        {cardKey === "energy" ? (
          <CategorySection
            id="collection-key"
            title="Energy collection key"
            icon={BookOpen}
            accent="cyan"
            description="Bind the card to a specific Home Assistant energy dashboard's collection."
            intro={
              <Prose>
                <p>
                  Home Assistant exposes one energy collection per dashboard plus a default. Each
                  collection has its own selected period (today, week, custom range). By default,
                  the card binds to the active dashboard's collection.
                </p>
                <p>
                  Set <code>collection_key</code> to follow a specific dashboard. Keys follow the
                  pattern <code>energy_&lt;dashboard_url&gt;</code>.
                </p>
              </Prose>
            }
            example={{
              language: "yaml",
              code: `type: ${v.cardType}
collection_key: energy_living_room
entities:
  grid:
    entity: sensor.grid_energy
  solar:
    entity: sensor.solar_energy`,
            }}
          >
            <OptionList
              rows={[
                {
                  name: "collection_key",
                  type: "string",
                  description: (
                    <>
                      The key of the energy collection to follow. Leave unset to track the active
                      dashboard.
                    </>
                  ),
                },
              ]}
            />
          </CategorySection>
        ) : null}

        <CategorySection
          id="flow-formula"
          title="Flow formulas"
          icon={Calculator}
          accent="violet"
          description="The card animates dots along the lines. There are two formulas controlling how fast they travel."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Default
                </span>
                <h3 className="text-foreground text-sm font-semibold">Legacy (relative)</h3>
              </div>
              <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                Each line's flow rate is calculated relative to all the others. When one line
                dominates, dots accelerate to keep a roughly constant dot count.
              </p>
              <CodeBlock
                language="js"
                code={`max - (value / totalLines) * (max - min);
// max = max_flow_rate
// min = min_flow_rate
// value = line value (e.g. solar to grid)
// totalLines = sum of all line values`}
              />
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Recommended
                </span>
                <h3 className="text-foreground text-sm font-semibold">New (absolute)</h3>
              </div>
              <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                Speed maps directly to the value. A constant value always animates at the same speed
                regardless of other lines. Set <code>use_new_flow_rate_model: true</code> and tune
                the <code>min/max_expected_power</code> + <code>min/max_flow_rate</code> pairs.
              </p>
              <CodeBlock
                language="js"
                code={`if (value > maxIn) return maxOut;
return ((value - minIn) * (maxOut - minOut)) / (maxIn - minIn) + minOut;`}
              />
            </div>
          </div>
        </CategorySection>

        <NextPageNav
          prev={{ label: "Installation", to: `${v.basePath}/installation` }}
          next={{ label: "Examples", to: `${v.basePath}/examples` }}
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

export function ExamplesPage({ cardKey }: { cardKey: CardKey }) {
  const v = variant(cardKey);
  const sensorSuffix = cardKey === "power" ? "power" : "energy";

  return (
    <>
      <PageHeader
        eyebrow={v.title}
        title="Examples"
        description="Copy-pastable configs for the most common setups."
      />

      <Callout variant="info" title="Don't forget!">
        These are just basic getting started examples.{" "}
        <b>Always replace the entity ids with your own.</b>
      </Callout>
      <Section id="only-grid" title="Only grid">
        <CodeBlock
          language="yaml"
          code={`type: ${v.cardType}
entities:
  grid:
    entity: sensor.grid_${sensorSuffix}
    power_outage:
      entity: sensor.power_outage
    display_state: one_way
    color_circle: true
kilo_threshold: 10000`}
        />
      </Section>

      <Section id="grid-solar" title="Grid + solar">
        <CodeBlock
          language="yaml"
          code={`type: ${v.cardType}
entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
    display_state: one_way
    color_circle: true
  solar:
    entity: sensor.solar_${sensorSuffix === "energy" ? "energy" : "production"}`}
        />
      </Section>

      <Section id="grid-solar-battery" title="Grid + solar + battery">
        <CodeBlock
          language="yaml"
          code={`type: ${v.cardType}
entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
    display_state: one_way
    color_circle: true
  solar:
    entity: sensor.solar_${sensorSuffix === "energy" ? "energy" : "production"}
  battery:
    entity:
      consumption: sensor.battery_consumption
      production: sensor.battery_production
    state_of_charge: sensor.battery_state_of_charge
    display_state: one_way
    color_circle: true
  home:
    color_icon: true
kilo_threshold: 10000`}
        />
      </Section>

      <Section id="full-config" title="Mix &amp; match (full config)">
        <Prose>
          <p>
            Demonstrates many of the available options at once. You don't need most of these, this
            is here as a reference of what is possible.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${v.cardType}
entities:
  home:
    entity: sensor.home_consumption
    color_icon: solar
  fossil_fuel_percentage:
    entity: sensor.fossil_fuel_percentage
    icon: mdi:pine-tree
    color_icon: true
    display_zero: true
    name: Non Fossil
    state_type: power
  grid:
    icon: mdi:ab-testing
    name: Provider
    entity:
      production: sensor.grid_production
      consumption: sensor.grid_consumption
  solar:
    icon: mdi:solar-panel-large
    entity: sensor.solar_production
  battery:
    name: Bateria
    icon: mdi:battery-high
    entity:
      consumption: sensor.battery_consumption
      production: sensor.battery_production
    state_of_charge: sensor.battery_soc
  individual:
    - entity: sensor.car_${sensorSuffix}
      icon: mdi:car-electric
      color: "#80b8ff"
      name: Denim Flash
    - entity: sensor.motorbike_${sensorSuffix}
      name: Qivi
      color_icon: true
      display_zero: true
      color: "#ff8080"
      icon: mdi:motorbike-electric
base_decimals: 0
kilo_decimals: 2
min_flow_rate: 0.9
max_flow_rate: 6
kilo_threshold: 10000
clickable_entities: true
title: ${v.title}`}
        />
      </Section>

      {cardKey === "energy" ? (
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
            code={`type: ${v.cardType}
collection_key: energy_living_room
entities:
  grid:
    entity: sensor.grid_energy
  solar:
    entity: sensor.solar_energy`}
          />
        </Section>
      ) : null}

      <NextPageNav prev={{ label: "Configuration", to: `${v.basePath}/configuration` }} />
    </>
  );
}
