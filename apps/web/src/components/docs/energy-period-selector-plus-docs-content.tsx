import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  GitCompareArrows,
  Github,
  MousePointerClick,
  Package,
  Settings,
  Wrench,
} from "lucide-react";
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
import { InstallFromLink } from "./install-from-link";
import { OptionList } from "./option-list";
import { PageTOC, type TocItem } from "./page-toc";

const TITLE = "Energy Period Selector Plus";
const PKG = "energy-period-selector-plus";
const CARD_TYPE = "custom:energy-period-selector-plus";
const BASE_PATH = "/energy-period-selector-plus";
const REPO_URL = "https://github.com/flixlix/energy-period-selector-plus";
const HACS_REDIRECT =
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=energy-period-selector-plus&category=plugin";
const RELEASE_URL = "https://github.com/flixlix/energy-period-selector-plus/releases/latest";

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
        description="Picks the period shown by the energy cards on the same dashboard: day, week, month, year or any range, with previous/next, today and compare buttons."
        badges={[{ label: "HACS custom" }, { label: "YAML & UI editor" }, { label: "Energy" }]}
      />

      <CardDemo demo="period" className="mx-auto w-fit max-w-full rounded-xl border" />
      <p className="text-muted-foreground mt-2 mb-8 text-center text-sm">
        The real card, live, driving an Energy Flow Card Plus below it.{" "}
        <Link
          to="/energy-period-selector-plus/playground"
          className="text-primary underline-offset-4 hover:underline"
        >
          Try it in the playground
        </Link>
        .
      </p>

      <Prose className="mt-4">
        <p>
          <strong>{TITLE}</strong> works like Home Assistant&apos;s{" "}
          <a
            href="https://www.home-assistant.io/dashboards/energy/#energy-date-picker"
            target="_blank"
            rel="noopener noreferrer"
          >
            energy date picker
          </a>
          , with period buttons, an optional compare button and a card background so it matches the
          cards around it.
        </p>
        <p>
          It drives the energy collection Home Assistant creates for the dashboard, so every energy
          card on it follows the period you pick: HA&apos;s own energy cards, and{" "}
          <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> and{" "}
          <Link to="/energy-breakdown-card">Energy Breakdown Card</Link> with{" "}
          <code>energy_date_selection: true</code>.
        </p>
      </Prose>

      <Section title="Highlights">
        <ul className="text-foreground/90 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <HighlightItem>Day / week / month / year / custom buttons, in your order</HighlightItem>
          <HighlightItem>Custom ranges in Home Assistant&apos;s own calendar</HighlightItem>
          <HighlightItem>Previous, next and today buttons</HighlightItem>
          <HighlightItem>Compare with the previous period</HighlightItem>
          <HighlightItem>Optional card background and title</HighlightItem>
          <HighlightItem>Remembers the last picked period, like HA</HighlightItem>
        </ul>
      </Section>

      <Section title="What's in this section">
        <div className="grid gap-3 md:grid-cols-2">
          <SectionCard
            to={`${BASE_PATH}/installation`}
            icon={Package}
            title="Installation"
            description="Marketplace, HACS custom repository or manual install."
          />
          <SectionCard
            to={`${BASE_PATH}/configuration`}
            icon={BookOpen}
            title="Configuration"
            description="Every option, with defaults and types."
          />
          <SectionCard
            to={`${BASE_PATH}/examples`}
            icon={Wrench}
            title="Examples"
            description="Copy-pastable configs, including one paired with Energy Flow Card Plus."
          />
        </div>
      </Section>

      <Section title="Source & releases">
        <Prose>
          <p>
            The card is distributed via{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              flixlix/energy-period-selector-plus
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
        description="Install it from its link in Home Assistant's Marketplace, or as a custom repository in HACS before 2026.11. Manual installation is also supported."
      />

      <InstallFromLink title={TITLE} repoUrl={REPO_URL} redirect={HACS_REDIRECT} />

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
        <Callout variant="tip" title="Installed from the Marketplace or HACS?">
          It registers the resource for you. The Marketplace serves it from
          <code>
            /local/community/{PKG}/{PKG}.js
          </code>
          ; HACS used
          <code>
            /hacsfiles/{PKG}/{PKG}.js
          </code>
          , which keeps working.
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
          <p>
            The selector needs an energy collection to drive. On a dashboard without any of
            HA&apos;s energy cards it adds a hidden HA energy date picker, so HA creates one.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
card_background: true`}
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
  { name: "type", type: "string", required: true, description: <code>{CARD_TYPE}</code> },
  {
    name: "card_background",
    type: "boolean",
    default: "false",
    description: "Show the selector on a card, like the cards around it.",
  },
  {
    name: "title",
    type: "string",
    description: (
      <>
        Card title, shown with <code>card_background: true</code>.
      </>
    ),
  },
  {
    name: "collection_key",
    type: "string",
    default: "the dashboard's",
    description: (
      <>
        Like in HA&apos;s energy cards: drive another energy collection. Must start with{" "}
        <code>energy_</code>.
      </>
    ),
  },
];

const BUTTON_OPTIONS: OptionRow[] = [
  {
    name: "period_buttons",
    type: "list",
    default: "[day, week, month, year]",
    description: (
      <>
        Period buttons and their order. Add <code>custom</code> to pick any range in HA&apos;s
        calendar.
      </>
    ),
  },
  {
    name: "custom_period_label",
    type: "string",
    default: "Custom",
    description: (
      <>
        Label of the <code>custom</code> button.
      </>
    ),
  },
  {
    name: "prev_next_buttons",
    type: "boolean",
    default: "true",
    description: "Show the previous and next buttons.",
  },
  {
    name: "today_button_type",
    type: "text | icon | false",
    default: "text",
    description: (
      <>
        Style of the today button; <code>false</code> hides it.
      </>
    ),
  },
  {
    name: "date_picker",
    type: "boolean",
    default: "false",
    description: (
      <>
        Click the date to pick any range in HA&apos;s calendar, in every period (always on for{" "}
        <code>custom</code>).
      </>
    ),
  },
];

const COMPARE_OPTIONS: OptionRow[] = [
  {
    name: "compare_button_type",
    type: "text | icon",
    description: "Show a button that compares with the previous period.",
  },
  {
    name: "compare_button_label",
    type: "string",
    default: 'HA\'s "Compare data"',
    description: "Label of the text compare button.",
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

// ---------- Configuration ----------

export function ConfigurationPage() {
  const tocItems: TocItem[] = [
    { id: "card-options", label: "Card options" },
    { id: "buttons", label: "Buttons" },
    { id: "compare", label: "Compare" },
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
          The <Link to={`${BASE_PATH}/examples`}>Examples</Link> page has configs you can paste
          straight into your dashboard, including one paired with Energy Flow Card Plus.
        </Callout>

        <div className="my-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigShortcut
            to="#card-options"
            icon={Settings}
            label="Card options"
            hint="Background, title, collection"
            accent="bg-slate-500/10 text-slate-700 dark:text-slate-300"
          />
          <ConfigShortcut
            to="#buttons"
            icon={MousePointerClick}
            label="Buttons"
            hint="Periods, prev/next, today, calendar"
            accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          />
          <ConfigShortcut
            to="#compare"
            icon={GitCompareArrows}
            label="Compare"
            hint="Compare with the previous period"
            accent="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          />
        </div>

        <CategorySection
          id="card-options"
          title="Card options"
          icon={Settings}
          accent="slate"
          description="The card type, its background and title, and which energy collection it drives."
          example={{
            language: "yaml",
            code: `type: ${CARD_TYPE}
card_background: true
title: Energy period`,
          }}
        >
          <OptionList rows={CARD_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="buttons"
          title="Buttons"
          icon={MousePointerClick}
          accent="blue"
          description="Which periods can be picked, in which order, and how you move between them."
          example={{
            language: "yaml",
            code: `period_buttons: [day, week, month, year, custom]
custom_period_label: Range
prev_next_buttons: true
today_button_type: icon
date_picker: true`,
          }}
        >
          <OptionList rows={BUTTON_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="compare"
          title="Compare"
          icon={GitCompareArrows}
          accent="violet"
          description="A button that turns on HA's comparison with the previous period."
          example={{
            language: "yaml",
            code: `compare_button_type: text
compare_button_label: Compare`,
          }}
        >
          <OptionList rows={COMPARE_OPTIONS} />
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

      <Section id="minimal" title="On a card">
        <Prose>
          <p>The default buttons, on a card background.</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
card_background: true`}
        />
      </Section>

      <Section id="icons" title="Icons, compare and custom periods">
        <Prose>
          <p>
            A title, icon buttons for today and compare, and only month, year and custom ranges.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
card_background: true
title: Energy period
today_button_type: icon
compare_button_type: icon
period_buttons: [month, year, custom]`}
        />
      </Section>

      <Section id="date-picker" title="Pick any range from the date">
        <Prose>
          <p>
            With <code>date_picker</code>, clicking the date opens HA&apos;s calendar in every
            period, not only in <code>custom</code>.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
card_background: true
date_picker: true
period_buttons: [day, week, month, year, custom]`}
        />
      </Section>

      <Section id="with-energy-flow" title="With Energy Flow Card Plus">
        <Prose>
          <p>
            Stack it above an <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> that
            follows the picked period with <code>energy_date_selection: true</code>.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: vertical-stack
cards:
  - type: ${CARD_TYPE}
    card_background: true
  - type: custom:energy-flow-card-plus
    energy_date_selection: true
    entities:
      grid:
        entity:
          consumption: sensor.grid_consumption
          production: sensor.grid_production
      solar:
        entity: sensor.solar_energy`}
        />
        <Callout variant="tip" title="Try it live">
          Try these options in the{" "}
          <Link to="/energy-period-selector-plus/playground">playground</Link>, with an Energy Flow
          Card Plus following the period you pick.
        </Callout>
      </Section>

      <NextPageNav prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }} />
    </>
  );
}
