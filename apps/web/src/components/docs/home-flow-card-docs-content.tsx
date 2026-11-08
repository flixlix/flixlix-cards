import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Download,
  Eye,
  Github,
  House,
  Package,
  Palette,
  Play,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type * as React from "react";
import { parse, stringify } from "yaml";

import { CardDemo } from "@/components/card-demo";
import { type CardConfig, CardPreview } from "@/components/card-preview";
import { type HouseMoment, houseMoments } from "@/components/demos";
import { sensor, type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";
import { Button } from "@flixlix-cards/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flixlix-cards/ui/components/card";

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
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=plugin";
const RELEASE_URL = "https://github.com/flixlix/home-flow-card/releases/latest";

const MINIMAL_CONFIG = `type: ${CARD_TYPE}
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc`;

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

/** A moment of the day as the playground's setup, so a link can open it there. */
const playgroundSearch = ({ config, states }: HouseMoment) => ({
  s: { yaml: stringify(config), states, width: 440 },
});

const BENEFITS: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}[] = [
  {
    icon: Eye,
    title: "Reads at a glance",
    text: "Solar sits on the roof, the battery on the wall, the grid runs off to the street. You know where your power comes from before you read a single number.",
  },
  {
    icon: Activity,
    title: "Motion that means something",
    text: "A pulse runs along every wire in the direction its power flows, faster and longer the more it carries. Numbers roll to their new value, units slide along, and the battery's word changes only the letters that change.",
  },
  {
    icon: Palette,
    title: "Made for your dashboard",
    text: "Monotone greys taken from your theme, light and dark, with colour only where power flows. It scales to any card width, and the visual editor sets it up without YAML.",
  },
  {
    icon: ShieldAlert,
    title: "Ready for the bad days",
    text: "When the grid fails, its cable goes dead and its label says so. An optional generator appears, wired to the inverter and never to the grid, and its label takes the grid's place. A nearly empty battery turns its bar yellow, then red.",
  },
];

function Benefit({ icon: Icon, title, text }: (typeof BENEFITS)[number]) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="bg-primary/10 text-primary mb-3 flex size-9 items-center justify-center rounded-lg">
        <Icon className="size-4.5" />
      </div>
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function Moment({ moment }: { moment: HouseMoment }) {
  return (
    <figure className="flex flex-col gap-3">
      <CardPreview
        configs={[moment.config]}
        states={moment.states}
        width={400}
        className="mx-auto w-fit max-w-full rounded-xl border"
      />
      <figcaption className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="text-sm font-semibold">{moment.name}</div>
          <p className="text-muted-foreground text-sm">{moment.caption}</p>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link to={`${BASE_PATH}/playground`} search={playgroundSearch(moment)}>
            Play <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </figcaption>
    </figure>
  );
}

export function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Your own little isometric home"
        description="Home Flow Card draws your live power on a little house: solar on the roof, a battery on the wall and the grid running off to the street. One look tells you where your power comes from and where it goes."
        badges={[{ label: "HACS custom" }, { label: "YAML & UI editor" }, { label: "Power" }]}
      />

      <CardDemo demo="house" className="mx-auto w-fit max-w-full rounded-xl border" />
      <p className="text-muted-foreground mt-2 text-center text-sm">
        Not a screenshot: the real card, running right here.
      </p>
      <div className="mt-5 mb-12 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <a href={HACS_REDIRECT} target="_blank" rel="noopener noreferrer">
            <Download className="size-4" /> Get it in HACS
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link to={`${BASE_PATH}/playground`}>
            <Play className="size-4" /> Try it in the playground
          </Link>
        </Button>
      </div>

      <Section title="Why a house?">
        <div className="grid gap-3 md:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <Benefit key={benefit.title} {...benefit} />
          ))}
        </div>
      </Section>

      <Section
        id="a-day"
        title="A day on your house"
        description="The same card through the day. Each one is live; open it in the playground to make it yours."
      >
        <div className="grid gap-8 md:grid-cols-2">
          {houseMoments.map((moment) => (
            <Moment key={moment.name} moment={moment} />
          ))}
        </div>
      </Section>

      <Section title="Set up in a minute">
        <Prose>
          <p>
            Point it at the sensors you already have: grid, solar, battery and, if you like, the
            home. Leave one out and the house simply doesn&apos;t draw it.
          </p>
        </Prose>
        <CodeBlock language="yaml" code={MINIMAL_CONFIG} />
        <Callout variant="tip" title="Already using Power Flow Card Plus?">
          Home Flow Card reads the same sensors and its nodes take the same options. Change the{" "}
          <code>type</code>, move <code>grid</code>, <code>solar</code>, <code>battery</code> and{" "}
          <code>home</code> out of <code>entities</code>, and your house is ready. Individual
          devices are not drawn yet; keep Power Flow Card Plus for those.
        </Callout>
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
            description="Copy-pastable configs, each shown live."
          />
          <SectionCard
            to={`${BASE_PATH}/playground`}
            icon={Play}
            title="Playground"
            description="Edit the config and drag the sensors; share the link."
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
        cable. Needs <code>grid.power_outage</code> to know when the grid is down. While it runs,
        its label takes the place of the grid&apos;s; otherwise the grid&apos;s label shows its
        import or export, or a dash and <code>power_outage.label_alert</code> (default &quot;Power
        Outage&quot;) when the grid is down.
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

const AFTERNOON = houseMoments[0]?.states ?? {};

const EXAMPLES: {
  id: string;
  title: string;
  text: string;
  code: string;
  states: StateFixtures;
}[] = [
  {
    id: "solar-battery",
    title: "Solar and a battery",
    text: "The full house: solar, a battery with its state of charge, and the grid.",
    code: MINIMAL_CONFIG,
    states: AFTERNOON,
  },
  {
    id: "split",
    title: "Separate sensors, an outage and a generator",
    text: "One sensor per direction, the grid's outage sensor, and a generator that appears when the grid goes down. Here the grid is down.",
    code: `type: ${CARD_TYPE}
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
  state_of_charge: sensor.battery_soc`,
    states: {
      "sensor.grid_import_power": "1400",
      "sensor.grid_export_power": "0",
      "binary_sensor.grid_outage": sensor("on", { unit: undefined }),
      "sensor.generator_power": "1400",
      "sensor.solar_power": "600",
      "sensor.battery_discharge_power": "0",
      "sensor.battery_charge_power": "300",
      "sensor.battery_soc": sensor("41", { unit: "%" }),
    },
  },
  {
    id: "thresholds",
    title: "Your own battery thresholds",
    text: "Turn the charge bar yellow and red where it matters for your battery.",
    code: `type: ${CARD_TYPE}
grid:
  entity: sensor.grid_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
  state_of_charge_severity:
    red: 25
    yellow: 50`,
    states: {
      "sensor.grid_power": "300",
      "sensor.battery_power": "800",
      "sensor.battery_soc": sensor("44", { unit: "%" }),
    },
  },
  {
    id: "grid-only",
    title: "Grid only",
    text: "Without solar or a battery, the house shows the grid feeding the home.",
    code: `type: ${CARD_TYPE}
grid:
  entity: sensor.grid_power`,
    states: { "sensor.grid_power": "860" },
  },
  {
    id: "still",
    title: "Still numbers and wires",
    text: "Plain numbers and no pulses, for a calmer dashboard.",
    code: `type: ${CARD_TYPE}
animate_numbers: false
disable_dots: true
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power`,
    states: AFTERNOON,
  },
];

const isConfig = (value: unknown): value is CardConfig =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

function LiveExample({ code, states }: { code: string; states: StateFixtures }) {
  const config: unknown = parse(code);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <CodeBlock language="yaml" code={code} />
      {isConfig(config) ? (
        <CardPreview
          configs={[config]}
          states={states}
          width={400}
          className="mx-auto w-fit max-w-full rounded-xl border"
        />
      ) : null}
    </div>
  );
}

export function ExamplesPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title="Examples"
        description="Copy-pastable configs for the most common setups, each next to the card it draws."
      />

      {EXAMPLES.map((example) => (
        <Section key={example.id} id={example.id} title={example.title}>
          <Prose>
            <p>{example.text}</p>
          </Prose>
          <LiveExample code={example.code} states={example.states} />
        </Section>
      ))}

      <Callout variant="tip" title="Try your own">
        Paste your config into the <Link to={`${BASE_PATH}/playground`}>playground</Link> and drag
        the sensors to see every state of your house.
      </Callout>

      <NextPageNav
        prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }}
        next={{ label: "Playground", to: `${BASE_PATH}/playground` }}
      />
    </>
  );
}
