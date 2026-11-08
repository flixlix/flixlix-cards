import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Github, House, Package, Settings, Wrench } from "lucide-react";
import type * as React from "react";

import { CardDemo } from "@/components/card-demo";
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

const TITLE = "Home Flow Card";
const PKG = "home-flow-card";
const CARD_TYPE = "custom:home-flow-card";
const BASE_PATH = "/home-flow-card";
const REPO_URL = "https://github.com/flixlix/home-flow-card";
const HACS_REDIRECT =
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=Dashboard";
const RELEASE_URL = "https://github.com/flixlix/home-flow-card/releases/latest";

const MINIMAL_CONFIG = `type: ${CARD_TYPE}
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc`;

function HighlightItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="bg-muted/40 flex items-center gap-2 rounded-md border p-3">
      <Checkbox className="pointer-events-none" checked />
      {children}
    </li>
  );
}

function SectionCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="outline">
          <Link to={to}>
            Open <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- Overview ----------

export function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Overview"
        description="Your power flows drawn on an isometric house: solar panels on the roof, a battery on the wall and every wire running through the inverter, with the values next to what they measure."
        badges={[{ label: "HACS custom" }, { label: "YAML & UI editor" }, { label: "Power" }]}
      />

      <CardDemo demo="house" className="mx-auto w-fit max-w-full rounded-xl border" />
      <p className="text-muted-foreground mt-2 mb-8 text-center text-sm">
        The real card, live: a sunny afternoon, charging the battery and exporting the surplus.
      </p>

      <Prose className="mt-4">
        <p>
          <strong>{TITLE}</strong> reads the same sensors as{" "}
          <Link to="/power-flow-card-plus">Power Flow Card Plus</Link>, and its <code>grid</code>,{" "}
          <code>solar</code>, <code>battery</code> and <code>home</code> take the same options, at
          the top level of the card. Instead of circles and lines, every node is wired to the
          inverter on the house wall: a pulse runs along a wire in the direction its power flows,
          faster and longer the more power it carries.
        </p>
        <p>
          It shows solar, battery, grid and home for now. Individual devices are not drawn yet; use
          Power Flow Card Plus for those.
        </p>
      </Prose>

      <Section title="Highlights">
        <ul className="text-foreground/90 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <HighlightItem>Solar on the roof, battery on the wall, grid to the street</HighlightItem>
          <HighlightItem>Only what you configure is drawn</HighlightItem>
          <HighlightItem>Numbers that roll to their new value</HighlightItem>
          <HighlightItem>Battery icon and charge colours from its state of charge</HighlightItem>
          <HighlightItem>
            A dead grid cable in an outage, with an optional generator on the inverter
          </HighlightItem>
          <HighlightItem>Greys taken from your theme, light and dark</HighlightItem>
        </ul>
      </Section>

      <Section title="What's in this section">
        <div className="grid gap-3 md:grid-cols-2">
          <SectionCard
            to={`${BASE_PATH}/installation`}
            icon={Package}
            title="Installation"
            description="HACS custom repository or manual install."
          />
          <SectionCard
            to={`${BASE_PATH}/configuration`}
            icon={BookOpen}
            title="Configuration"
            description="The nodes and the card's own options."
          />
          <SectionCard
            to={`${BASE_PATH}/examples`}
            icon={Wrench}
            title="Examples"
            description="Copy-pastable configs."
          />
        </div>
      </Section>

      <Section title="Source & releases">
        <Prose>
          <p>
            The card is distributed via{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              flixlix/{PKG}
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
        description="This card is not in the default HACS store — add it as a custom repository first. Manual installation is also supported."
      />

      <Callout variant="info" title="Custom repository required">
        <strong>{TITLE}</strong> is not part of the default HACS index. Add the repository URL below
        as a <em>Custom repository</em> in HACS to install it.
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
            and copy it into <code>config/www/</code>, then register the resource:
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`lovelace:
  resources:
    - url: /local/${PKG}.js
      type: module`}
        />
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
        <CodeBlock language="yaml" code={MINIMAL_CONFIG} />
      </Section>

      <NextPageNav
        prev={{ label: "Overview", to: BASE_PATH }}
        next={{ label: "Configuration", to: `${BASE_PATH}/configuration` }}
      />
    </>
  );
}

// ---------- Configuration ----------

const CARD_OPTIONS: OptionRow[] = [
  { name: "type", type: "string", required: true, description: <code>{CARD_TYPE}</code> },
  {
    name: "grid / solar / battery / home",
    type: "object",
    description: (
      <>
        <code>grid</code>, <code>solar</code>, <code>battery</code> and <code>home</code>,
        configured as in <Link to="/power-flow-card-plus/configuration">Power Flow Card Plus</Link>,
        at the top level of the card. Leave one out and it is not drawn; one of grid, solar or
        battery is required.
      </>
    ),
  },
  { name: "title", type: "string", description: "Card title." },
  {
    name: "animate_numbers",
    type: "boolean",
    default: "true",
    description:
      "Roll each number to its new value when a reading changes. Always still when your system asks for reduced motion.",
  },
  {
    name: "clickable_entities",
    type: "boolean",
    default: "false",
    description: "Tapping a value opens its entity, or runs the node's tap/hold actions.",
  },
  {
    name: "battery.state_of_charge_severity",
    type: "object",
    default: "{ red: 15, yellow: 30 }",
    description: (
      <>
        The battery&apos;s charge bar colours, in %: red below <code>red</code>, yellow below{" "}
        <code>yellow</code>, green above both. Its icon follows the state of charge as in Power Flow
        Card Plus, and its label shows the state of charge and whether it is charging.
      </>
    ),
  },
  {
    name: "generator",
    type: "object",
    description: (
      <>
        <code>entity</code> (and optional <code>name</code>) of a generator the inverter switches to
        during a grid outage. It gets its own wire into the inverter and is never drawn on the grid
        cable. Needs <code>grid.power_outage</code> to know when the grid is down. The grid itself
        has no label, so its <code>name</code> and <code>power_outage.label_alert</code> are not
        shown.
      </>
    ),
  },
  {
    name: "disable_dots",
    type: "boolean",
    default: "false",
    description: "Keep the wires still: no pulses, only the colour of the power they carry.",
  },
];

const NUMBER_OPTIONS: OptionRow[] = [
  { name: "base_decimals", type: "number", default: "0", description: "Decimals of values in W." },
  { name: "kilo_decimals", type: "number", default: "1", description: "Decimals of values in kW." },
  {
    name: "kilo_threshold",
    type: "number",
    default: "1000",
    description: "From how many watts a value is shown in kW.",
  },
  {
    name: "min_flow_rate / max_flow_rate",
    type: "number",
    default: "0.75 / 6",
    description: "Seconds per pulse at the most and the least power.",
  },
  {
    name: "min_expected_power / max_expected_power",
    type: "number",
    default: "0.01 / 2000",
    description: "The power range the pulse speed follows.",
  },
];

export function ConfigurationPage() {
  const tocItems: TocItem[] = [
    { id: "card-options", label: "Card options" },
    { id: "numbers", label: "Numbers and pulses" },
  ];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-10">
      <div className="min-w-0">
        <PageHeader
          eyebrow={TITLE}
          title="Configuration"
          description={
            <>
              The card&apos;s own options. Required fields are marked with{" "}
              <span className="text-destructive font-mono">*</span>.
            </>
          }
        />

        <Callout variant="tip" title="Coming from Power Flow Card Plus?">
          Change <code>type</code> to <code>{CARD_TYPE}</code> and move <code>grid</code>,{" "}
          <code>solar</code>, <code>battery</code> and <code>home</code> out of{" "}
          <code>entities</code> to the top level; their options stay the same. Options that only
          change Power Flow Card Plus&apos; circles and lines (for example{" "}
          <code>display_zero_lines</code>) have no effect here.
        </Callout>

        <CategorySection
          id="card-options"
          title="Card options"
          icon={Settings}
          accent="slate"
          description="The card type, which nodes it draws, and how it moves."
          example={{ language: "yaml", code: `${MINIMAL_CONFIG}\nanimate_numbers: true` }}
        >
          <OptionList rows={CARD_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="numbers"
          title="Numbers and pulses"
          icon={House}
          accent="blue"
          description="How values are rounded and how fast the pulses run, shared with Power Flow Card Plus."
          example={{
            language: "yaml",
            code: `kilo_threshold: 1000
kilo_decimals: 2
max_expected_power: 5000`,
          }}
        >
          <OptionList rows={NUMBER_OPTIONS} />
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

      <Section id="solar-battery" title="Solar and a battery">
        <Prose>
          <p>The full house: solar, a battery with its state of charge, and the grid.</p>
        </Prose>
        <CodeBlock language="yaml" code={MINIMAL_CONFIG} />
      </Section>

      <Section id="split" title="Separate import and export sensors">
        <Prose>
          <p>One sensor per direction, the power-outage alert and a generator for outages.</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
grid:
  entity:
    consumption: sensor.grid_import_power
    production: sensor.grid_export_power
  power_outage:
    entity: binary_sensor.grid_outage
generator:
  entity: sensor.generator_power
solar:
  entity: sensor.solar_power
battery:
  entity:
    consumption: sensor.battery_discharge_power
    production: sensor.battery_charge_power
  state_of_charge: sensor.battery_soc`}
        />
      </Section>

      <Section id="grid-only" title="Grid only">
        <Prose>
          <p>Without solar or a battery, the house shows the grid feeding the home.</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
grid:
  entity: sensor.grid_power`}
        />
      </Section>

      <Section id="still" title="Still numbers and wires">
        <Prose>
          <p>Plain numbers and no pulses, for a calmer dashboard.</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
animate_numbers: false
disable_dots: true
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power`}
        />
      </Section>

      <NextPageNav prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }} />
    </>
  );
}
