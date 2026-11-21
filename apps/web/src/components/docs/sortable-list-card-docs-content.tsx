import { Link } from "@tanstack/react-router";
import { Eye, ListOrdered, Save, Settings } from "lucide-react";
import type * as React from "react";

import { trackEvent } from "#/lib/analytics";
import { heading } from "@/lib/page-meta";
import { sensor, type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";

import {
  CardHero,
  DemoGallery,
  Highlight,
  Highlights,
  SectionPages,
  SourceSection,
} from "./card-overview";
import { sortableGallery } from "@/components/demos";
import { CategorySection } from "./category-section";
import {
  Callout,
  CodeBlock,
  NextPageNav,
  type OptionRow,
  PageHeader,
  Prose,
  Section,
} from "./doc-primitives";
import { InstallFromLink } from "./install-from-link";
import { LiveExample } from "./live-example";
import { RelatedGuides } from "./related-guides";
import { OptionList } from "./option-list";
import { PageTOC, type TocItem } from "./page-toc";
import { SupportLinks } from "./support-links";

const TITLE = "Sortable List Card";
const PKG = "sortable-list-card";
const CARD_TYPE = "custom:sortable-list-card";
const BASE_PATH = "/sortable-list-card";
const REPO_URL = "https://github.com/flixlix/sortable-list-card";
const HACS_REDIRECT =
  "https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=sortable-list-card&category=plugin";
const RELEASE_URL = "https://github.com/flixlix/sortable-list-card/releases/latest";

// ---------- Overview ----------

export function OverviewPage() {
  return (
    <>
      <CardHero
        tags={["HACS custom", "YAML & UI editor", "Any service"]}
        title={TITLE}
        demo="sortable"
        installHref={HACS_REDIRECT}
      >
        <PageHeader
          className="mb-0"
          title={heading(BASE_PATH)}
          description="A drag-and-drop list that saves its order through any service."
        />
      </CardHero>

      <DemoGallery
        title="What you can build"
        description="Each one live; drag a row to reorder it."
        demos={sortableGallery}
      />

      <Highlights>
        <Highlight>Drag-and-drop reordering with a live drop indicator</Highlight>
        <Highlight>Up and down arrows for precise, accessible reordering</Highlight>
        <Highlight>
          Saves through <strong>any service</strong> with <code>{"{value}"}</code> placeholders
        </Highlight>
        <Highlight>CSV or JSON value formats</Highlight>
        <Highlight>Entity-backed items (name, icon, state) with overrides</Highlight>
        <Highlight>Optimistic updates, plus a full UI editor</Highlight>
      </Highlights>

      <Section title="Compare it">
        <RelatedGuides paths={["/guides"]} />
      </Section>

      <SectionPages basePath={BASE_PATH} />

      <SourceSection repoUrl={REPO_URL} />

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
        title={heading(`${BASE_PATH}/installation`)}
        description="Install it from its link in Home Assistant's Marketplace, or as a custom repository in HACS before 2026.11. Manual installation is also supported."
      />

      <InstallFromLink title={TITLE} repoUrl={REPO_URL} redirect={HACS_REDIRECT} />

      <Section title="Manual installation" id="manual">
        <Prose>
          <p>
            Download <code>{PKG}.js</code> from the{" "}
            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("Download release", { card: TITLE })}
            >
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
      data-llms-skip
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
          title={heading(`${BASE_PATH}/configuration`)}
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

        <SupportLinks card="Sortable List Card" />
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

const text = (state: string, name?: string) => sensor(state, { unit: undefined, name });

const EXAMPLE_STATES: StateFixtures = {
  "input_text.my_order": text("beta,alpha,gamma"),
  "input_text.hems_priority": text("battery,ev,heating,water_heater"),
  "input_text.room_order": text('["light.living_room","light.kitchen","light.bedroom"]'),
  "light.kitchen": text("on", "Kitchen"),
  "light.living_room": text("off", "Living room"),
  "light.bedroom": text("on", "Bedroom"),
};

export function ExamplesPage() {
  return (
    <>
      <PageHeader
        eyebrow={TITLE}
        title={heading(`${BASE_PATH}/examples`)}
        description="Copy-pastable configs for the most common setups, each next to the card it draws."
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
        <LiveExample
          states={EXAMPLE_STATES}
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
        <LiveExample
          states={EXAMPLE_STATES}
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
        <LiveExample
          states={EXAMPLE_STATES}
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
        <LiveExample
          states={EXAMPLE_STATES}
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
        <LiveExample
          states={EXAMPLE_STATES}
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

      <SupportLinks card="Sortable List Card" />
      <NextPageNav prev={{ label: "Configuration", to: `${BASE_PATH}/configuration` }} />
    </>
  );
}
