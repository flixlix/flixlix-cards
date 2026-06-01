import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Eye,
  Github,
  ListOrdered,
  Package,
  Save,
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

const TITLE = "Sortable List Card";
const PKG = "sortable-list-card";
const CARD_TYPE = "custom:sortable-list-card";
const BASE_PATH = "/sortable-list-card";
const REPO_URL = "https://github.com/flixlix/sortable-list-card";
const HACS_REDIRECT =
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=sortable-list-card&category=Dashboard";
const RELEASE_URL = "https://github.com/flixlix/sortable-list-card/releases/latest";

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
        description="A generic drag-and-drop reorderable list for Home Assistant. Drag rows (or use the arrows) to reorder, and the new order is saved by calling any service you configure."
        badges={[{ label: "HACS custom" }, { label: "YAML & UI editor" }, { label: "Any service" }]}
      />

      <Prose className="mt-4">
        <p>
          <strong>{TITLE}</strong> turns a plain list of items into an interactive, reorderable
          list. Each reorder is persisted through a service call of your choosing — by default it
          writes a comma-separated value to an <code>input_text</code> helper, but you can point it
          at a script, a <code>number</code>, or any other service.
        </p>
        <p>
          It's deliberately use-case agnostic. The order is stored as a list of <em>keys</em>, and
          what those keys mean is entirely up to you and your automations.
        </p>
      </Prose>

      <Section title="What can you build with it?">
        <Prose>
          <p>A few things people use a reorderable, persisted list for:</p>
          <ul>
            <li>
              <strong>HEMS load priority</strong> — order battery, EV charger, heating, hot water…
              so your energy-management automations know which load gets surplus solar first. This
              is the card's original use case.
            </li>
            <li>
              <strong>Device / room ordering</strong> — let users arrange entity-backed rows
              (lights, rooms, zones) and feed that order into another dashboard or template.
            </li>
            <li>
              <strong>Priority / triage lists</strong> — chores, a shopping list, a project backlog,
              or any “most important first” ranking.
            </li>
            <li>
              <strong>Scene / automation sequencing</strong> — decide the order scenes are applied
              or notifications are sent.
            </li>
            <li>
              <strong>Playlists & queues</strong> — a simple, persisted play order that a media
              automation consumes.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="Highlights">
        <ul className="text-foreground/90 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <HighlightItem>Drag-and-drop reordering with a live drop indicator</HighlightItem>
          <HighlightItem>Up/down arrow buttons for precise, accessible reordering</HighlightItem>
          <HighlightItem>
            Persist via <strong>any service</strong> with <code>{"{value}"}</code> placeholders
          </HighlightItem>
          <HighlightItem>CSV or JSON value formats</HighlightItem>
          <HighlightItem>Entity-backed items (name / icon / state) with overrides</HighlightItem>
          <HighlightItem>Optimistic updates, plus a full UI editor</HighlightItem>
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
              <CardDescription>Copy-pastable configs, including the HEMS list.</CardDescription>
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

      <Section title="Source & releases">
        <Prose>
          <p>
            The card is distributed via{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              flixlix/sortable-list-card
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
        description="This card is not in the default HACS store — you need to add it as a custom repository first. Manual installation is also supported."
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

      <Section title="Create a helper to store the order" id="helper">
        <Prose>
          <p>
            By default the card reads and writes the order to an <code>input_text</code> helper.
            Create one (Settings → Devices &amp; Services → Helpers, or via YAML) before adding the
            card:
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`input_text:
  my_order:
    name: My order
    max: 255
    initial: alpha,beta,gamma`}
        />
        <Callout variant="tip" title="No entity needed">
          If you persist through a custom service (a script, for example) and don't need the order
          read back into the card, you can omit <code>entity</code> entirely.
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
title: My order
entity: input_text.my_order
items:
  - key: alpha
    name: Alpha
  - key: beta
    name: Beta
  - key: gamma
    name: Gamma`}
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
    name: "items",
    type: "array",
    required: true,
    description: (
      <>
        The list rows. Each item is documented in the <a href="#item-options">Item options</a>{" "}
        section. Every item needs a <code>key</code> or an <code>entity</code>.
      </>
    ),
  },
  {
    name: "entity",
    type: "string",
    description: (
      <>
        Entity whose state holds the current order (the read-back source of truth). Optional — omit
        it for write-only persistence through a custom service.
      </>
    ),
  },
  {
    name: "value_format",
    type: "string",
    default: "csv",
    description: (
      <>
        How the order is parsed from / formatted into the entity value. One of <code>csv</code>{" "}
        (e.g. <code>a,b,c</code>) or <code>json</code> (e.g. <code>["a","b","c"]</code>).
      </>
    ),
  },
  { name: "title", type: "string", description: "Optional card title shown above the list." },
];

const DISPLAY_OPTIONS: OptionRow[] = [
  {
    name: "show_handle",
    type: "boolean",
    default: "true",
    description: "Show the drag handle on the left of each row.",
  },
  {
    name: "show_arrows",
    type: "boolean",
    default: "true",
    description: "Show the up/down arrow buttons. They are disabled at the list boundaries.",
  },
  {
    name: "show_rank",
    type: "boolean",
    default: "true",
    description: "Show the 1-based position number on each row.",
  },
  {
    name: "show_state",
    type: "boolean",
    default: "false",
    description: "Show the entity's state as secondary text (entity-backed items only).",
  },
];

const SAVE_ACTION_OPTIONS: OptionRow[] = [
  {
    name: "service",
    type: "string",
    required: true,
    description: (
      <>
        The service to call, in <code>domain.service</code> form (e.g.{" "}
        <code>input_text.set_value</code> or <code>script.save_order</code>).
      </>
    ),
  },
  {
    name: "data",
    type: "object",
    description: (
      <>
        Service data. Use the placeholders below for the new order. When omitted and the service is
        the default, <code>{`{ entity_id, value: "{value}" }`}</code> is sent.
      </>
    ),
  },
  {
    name: "target",
    type: "object",
    description: (
      <>
        Optional service target (<code>entity_id</code>, <code>device_id</code>,{" "}
        <code>area_id</code>). Placeholders are substituted here too.
      </>
    ),
  },
];

const PLACEHOLDER_OPTIONS: OptionRow[] = [
  {
    name: "{value}",
    type: "string",
    description: (
      <>
        The order formatted per <code>value_format</code> (a CSV or JSON string).
      </>
    ),
  },
  { name: "{value_csv}", type: "string", description: "Comma-separated keys, e.g. a,b,c." },
  { name: "{value_json}", type: "string", description: `JSON array string, e.g. ["a","b","c"].` },
  {
    name: "{value_list}",
    type: "array",
    description: (
      <>
        The raw array. Use it when the string is <em>exactly</em> <code>{"{value_list}"}</code> —
        the value is replaced with an actual list rather than a string.
      </>
    ),
  },
];

const ITEM_OPTIONS: OptionRow[] = [
  {
    name: "key",
    type: "string",
    description: (
      <>
        Stable identifier stored in the order. Defaults to the item's <code>entity</code> when
        omitted — at least one of <code>key</code> / <code>entity</code> is required.
      </>
    ),
  },
  {
    name: "entity",
    type: "string",
    description: "Entity to pull the friendly name, icon, and state from.",
  },
  {
    name: "name",
    type: "string",
    description: "Label override. Falls back to the entity's friendly name, then the key.",
  },
  {
    name: "icon",
    type: "string",
    description: "MDI icon override. Falls back to the entity's icon.",
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
    { id: "display", label: "Display" },
    { id: "save-action", label: "Save action" },
    { id: "item-options", label: "Item options" },
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
          paste straight into your dashboard, including the HEMS priority list.
        </Callout>

        <div className="my-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigShortcut
            to="#card-options"
            icon={Settings}
            label="Card options"
            hint="Type, entity, value format"
            accent="bg-slate-500/10 text-slate-700 dark:text-slate-300"
          />
          <ConfigShortcut
            to="#display"
            icon={Eye}
            label="Display"
            hint="Handle, arrows, rank, state"
            accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          />
          <ConfigShortcut
            to="#save-action"
            icon={Save}
            label="Save action"
            hint="Persist via any service"
            accent="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          />
          <ConfigShortcut
            to="#item-options"
            icon={ListOrdered}
            label="Item options"
            hint="Key, entity, name, icon"
            accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          />
        </div>

        <CategorySection
          id="card-options"
          title="Card options"
          icon={Settings}
          accent="slate"
          description="Top-level configuration — type, the items list, the read-back entity, and how the order value is stored."
          example={{
            language: "yaml",
            code: `type: ${CARD_TYPE}
title: My order
entity: input_text.my_order
value_format: csv
items:
  - key: alpha
    name: Alpha
  - key: beta
    name: Beta`,
          }}
        >
          <OptionList rows={CARD_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="display"
          title="Display"
          icon={Eye}
          accent="blue"
          description="Toggle the row affordances: the drag handle, arrow buttons, rank number, and entity state."
          example={{
            language: "yaml",
            code: `show_handle: true
show_arrows: true
show_rank: true
show_state: false`,
          }}
        >
          <OptionList rows={DISPLAY_OPTIONS} />
        </CategorySection>

        <CategorySection
          id="save-action"
          title="Save action"
          icon={Save}
          accent="violet"
          description="The service called on every reorder. This is what makes the card generic."
          intro={
            <Prose>
              <p>
                When <code>save_action</code> is omitted but <code>entity</code> is set, the card
                defaults to <code>input_text.set_value</code> on that entity. Provide your own to
                call <strong>any</strong> service instead — a script, a{" "}
                <code>number.set_value</code>, an MQTT publish, etc.
              </p>
              <p>
                Inside <code>data</code> and <code>target</code>, these placeholders are replaced
                with the new order on every reorder:
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `# Default behaviour (no save_action needed):
entity: input_text.my_order

# Or a fully custom service:
save_action:
  service: script.save_order
  data:
    order: "{value_list}"   # an actual list
    csv: "{value_csv}"      # "a,b,c"`,
          }}
        >
          <OptionList rows={SAVE_ACTION_OPTIONS} />
          <div className="mt-4">
            <OptionList rows={PLACEHOLDER_OPTIONS} />
          </div>
        </CategorySection>

        <CategorySection
          id="item-options"
          title="Item options"
          icon={ListOrdered}
          accent="green"
          description="Each entry in the items array. Items can be plain (key + label) or backed by an entity."
          intro={
            <Prose>
              <p>
                Reference an <code>entity</code> to pull its friendly name, icon, and (with{" "}
                <code>show_state</code>) its state automatically. Set <code>name</code> or{" "}
                <code>icon</code> to override. The stored <code>key</code> defaults to the entity id
                when omitted.
              </p>
            </Prose>
          }
          example={{
            language: "yaml",
            code: `items:
  - key: battery
    name: Battery
    icon: mdi:battery-charging
  - entity: light.kitchen       # key, name & icon inferred
  - entity: light.living_room
    name: Living room            # override the label`,
          }}
        >
          <OptionList rows={ITEM_OPTIONS} />
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
        These are getting-started examples.{" "}
        <b>Replace the keys, entities and services with your own,</b> and create the matching{" "}
        <code>input_text</code> helper where needed.
      </Callout>

      <Section id="minimal" title="Minimal (CSV input_text)">
        <Prose>
          <p>
            The smallest useful config: a few items stored as a comma-separated value in an{" "}
            <code>input_text</code> helper.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: My order
entity: input_text.my_order
items:
  - key: alpha
    name: Alpha
  - key: beta
    name: Beta
  - key: gamma
    name: Gamma`}
        />
      </Section>

      <Section id="hems" title="HEMS load priority (the original use case)">
        <Prose>
          <p>
            Order the loads your home energy management system should serve first. Your automations
            read <code>input_text.hems_priority</code> (a list like <code>battery,ev,heating</code>)
            to decide who gets surplus solar.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: Load priority
entity: input_text.hems_priority
items:
  - key: battery
    name: Battery
    icon: mdi:battery-charging
  - key: ev
    name: EV charger
    icon: mdi:car-electric
  - key: heating
    name: Heating
    icon: mdi:radiator
  - key: water_heater
    name: Hot water
    icon: mdi:water-boiler`}
        />
        <Prose>
          <p>With a matching helper:</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`input_text:
  hems_priority:
    name: HEMS Priority
    max: 255
    initial: battery,ev,heating,water_heater`}
        />
      </Section>

      <Section id="entity-backed" title="Entity-backed rows + a custom script">
        <Prose>
          <p>
            Items can reference entities, pulling their name, icon and state. Here the order is
            stored as JSON and handed to a script as a real list.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: Rooms
show_state: true
value_format: json
entity: input_text.room_order
save_action:
  service: script.save_room_order
  data:
    order: "{value_list}"
items:
  - entity: light.kitchen
  - entity: light.living_room
  - entity: light.bedroom`}
        />
      </Section>

      <Section id="custom-service" title="Write-only via a custom service (no entity)">
        <Prose>
          <p>
            If your automation owns the source of truth, you can skip <code>entity</code> entirely
            and just fire a service on each reorder.
          </p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
title: Notification order
save_action:
  service: script.set_notification_order
  data:
    keys: "{value_csv}"
items:
  - key: critical
    name: Critical alerts
    icon: mdi:alert
  - key: reminders
    name: Reminders
    icon: mdi:bell
  - key: digest
    name: Daily digest
    icon: mdi:email`}
        />
      </Section>

      <Section id="bare" title="Bare list (no handle, no arrows)">
        <Prose>
          <p>Hide the chrome for a cleaner, drag-only list.</p>
        </Prose>
        <CodeBlock
          language="yaml"
          code={`type: ${CARD_TYPE}
entity: input_text.my_order
show_handle: false
show_arrows: false
show_rank: false
items:
  - key: one
    name: One
  - key: two
    name: Two`}
        />
      </Section>

      <NextPageNav prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }} />
    </>
  );
}
