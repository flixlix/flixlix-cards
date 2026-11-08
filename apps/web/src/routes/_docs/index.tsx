import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarRange,
  ChartPie,
  Compass,
  Github,
  HeartHandshake,
  House,
  ListOrdered,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import * as React from "react";

import { CardDemo } from "@/components/card-demo";
import { cn } from "cn";
import { Button } from "@flixlix-cards/ui/components/button";

export const Route = createFileRoute("/_docs/")({
  component: IndexPage,
});

type CardEntry = {
  to: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: { chip: string; border: string };
  media: React.ReactNode;
  description: React.ReactNode;
  bullets: { id: string; content: React.ReactNode }[];
};

const CARDS: CardEntry[] = [
  {
    to: "/power-flow-card-plus",
    title: "Power Flow Card Plus",
    icon: Sparkles,
    accent: {
      chip: "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400",
      border: "hover:border-amber-500/40",
    },
    media: (
      <Thumbnail zoom={0.4}>
        <CardDemo demo="power" width={420} />
      </Thumbnail>
    ),
    description: (
      <>
        Visualizes <strong>instantaneous</strong> power distribution (W / kW). Best for live
        dashboards where you want to see what is flowing right now.
      </>
    ),
    bullets: [
      { id: "editor", content: "UI editor & YAML support" },
      { id: "devices", content: "Up to 4 individual devices" },
      { id: "bidirectional", content: "Bidirectional grid & battery flows" },
      { id: "outage", content: "Power outage handling and templates" },
    ],
  },
  {
    to: "/home-flow-card",
    title: "Home Flow Card",
    icon: House,
    accent: {
      chip: "bg-orange-500/10 text-orange-600 ring-orange-500/25 dark:text-orange-400",
      border: "hover:border-orange-500/40",
    },
    media: (
      <Thumbnail zoom={0.4}>
        <CardDemo demo="house" width={420} />
      </Thumbnail>
    ),
    description: (
      <>
        The same <strong>live</strong> power as Power Flow Card Plus, drawn on an isometric house:
        solar on the roof, a battery on the wall, every wire through the inverter.
      </>
    ),
    bullets: [
      { id: "config", content: "Power Flow Card Plus' node options, at the top level" },
      { id: "numbers", content: "Numbers that roll to their new value" },
      { id: "battery", content: "Battery icon and charge colours from its state of charge" },
      { id: "theme", content: "Greys from your theme, light and dark" },
    ],
  },
  {
    to: "/energy-flow-card-plus",
    title: "Energy Flow Card Plus",
    icon: Zap,
    accent: {
      chip: "bg-sky-500/10 text-sky-600 ring-sky-500/25 dark:text-sky-400",
      border: "hover:border-sky-500/40",
    },
    media: (
      <Thumbnail zoom={0.4}>
        <CardDemo demo="energy" width={420} />
      </Thumbnail>
    ),
    description: (
      <>
        Visualizes <strong>accumulated</strong> energy values (Wh / kWh) for the selected dashboard
        period (today, week, custom range, etc.).
      </>
    ),
    bullets: [
      { id: "collections", content: "Binds to Home Assistant energy collections" },
      { id: "config-style", content: "Same flexible config style as Power Flow" },
      {
        id: "dashboards",
        content: (
          <>
            Multiple dashboard support via <code>collection_key</code>
          </>
        ),
      },
      { id: "translations", content: "Translatable labels in 14+ languages" },
    ],
  },
  {
    to: "/energy-breakdown-card",
    title: "Energy Breakdown Card",
    icon: ChartPie,
    accent: {
      chip: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
      border: "hover:border-emerald-500/40",
    },
    media: (
      <Thumbnail zoom={0.24}>
        <CardDemo demo="breakdown" width={420} />
      </Thumbnail>
    ),
    description: (
      <>
        Visualizes how your energy use is <strong>broken down</strong> across sources, as a donut or
        stacked bar. Pairs well with the energy dashboard's selected period.
      </>
    ),
    bullets: [
      { id: "variants", content: "Donut and stacked-bar variants" },
      { id: "legend", content: "Optional legend with values & percentages" },
      {
        id: "grouping",
        content: (
          <>
            <code>group_others</code> + <code>max_items</code> to keep things tidy
          </>
        ),
      },
      { id: "hacs", content: "Custom HACS repository (not yet in the default index)" },
    ],
  },
  {
    to: "/energy-period-selector-plus",
    title: "Energy Period Selector Plus",
    icon: CalendarRange,
    accent: {
      chip: "bg-rose-500/10 text-rose-600 ring-rose-500/25 dark:text-rose-400",
      border: "hover:border-rose-500/40",
    },
    media: (
      <Thumbnail zoom={0.28}>
        <CardDemo demo="period" width={420} />
      </Thumbnail>
    ),
    description: (
      <>
        Picks the <strong>period</strong> every energy card on the dashboard shows: day, week,
        month, year or a custom range, like Home Assistant's energy date picker.
      </>
    ),
    bullets: [
      { id: "buttons", content: "Period buttons in the order you list them" },
      { id: "picker", content: "Custom ranges in Home Assistant's own calendar" },
      { id: "compare", content: "Previous, next, today and compare buttons" },
      {
        id: "cards",
        content: (
          <>
            Drives Energy Flow Card Plus and Energy Breakdown Card with{" "}
            <code>energy_date_selection</code>
          </>
        ),
      },
    ],
  },
  {
    to: "/sortable-list-card",
    title: "Sortable List Card",
    icon: ListOrdered,
    accent: {
      chip: "bg-violet-500/10 text-violet-600 ring-violet-500/25 dark:text-violet-400",
      border: "hover:border-violet-500/40",
    },
    media: <ListOrdered className="size-20 text-violet-500/40" />,
    description: (
      <>
        A generic <strong>drag-and-drop reorderable list</strong>. Saves the order via any service —
        perfect for a HEMS load-priority list, room ordering, or any ranking.
      </>
    ),
    bullets: [
      { id: "reorder", content: "Drag or use arrows to reorder" },
      { id: "persist", content: "Persist via any service with placeholders" },
      { id: "entities", content: "Entity-backed items (name, icon, state)" },
      { id: "hacs", content: "Custom HACS repository (not yet in the default index)" },
    ],
  },
];

/**
 * A live card, scaled down to fit a card tile; the tile links to its docs, so the card is inert.
 * A transform, not CSS `zoom`: Chrome draws a zoomed card's flow dots and line ends off their
 * lines. The scaled card keeps its layout size, centred in the fixed-height tile.
 */
function Thumbnail({ zoom, children }: { zoom: number; children: React.ReactNode }) {
  return (
    <div style={{ transform: `scale(${zoom})` }} className="pointer-events-none shrink-0" inert>
      {children}
    </div>
  );
}

function IndexPage() {
  return (
    <>
      <section className="from-card to-background relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-b">
        <div className="bg-grid-faint absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="bg-primary/10 absolute -top-24 right-0 size-80 rounded-full blur-3xl" />

        <div className="relative grid items-center gap-x-10 gap-y-8 p-8 md:p-12 lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div>
            <p className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-wide">
              <Zap className="size-3" /> Open source · MIT · HACS · Home Assistant
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
              See your home's energy{" "}
              <span className="from-amber-500 via-primary to-orange-600 bg-gradient-to-r bg-clip-text text-transparent">
                flow
              </span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed">
              Customizable Lovelace cards that tell the energy story of your home — animated flow
              diagrams between grid, solar, battery and devices, plus a breakdown chart for
              proportional consumption. Install, configure, and contribute, all documented here.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/power-flow-card-plus">
                  Get started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href="https://github.com/flixlix/flixlix-cards"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-4" /> GitHub
                </a>
              </Button>
            </div>
          </div>

          <CardDemo
            demo="power"
            width={400}
            className="mx-auto w-fit max-w-full rounded-2xl border shadow-sm"
          />
        </div>
      </section>

      <h2 className="mb-1 text-2xl font-semibold tracking-tight">The cards</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Five cards, one goal: making your dashboard worth looking at.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <article
            key={card.to}
            className={cn(
              "group bg-card relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
              card.accent.border
            )}
          >
            <div className="bg-muted/50 flex h-44 items-center justify-center overflow-hidden border-b">
              {card.media}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <h3 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                    card.accent.chip
                  )}
                >
                  <card.icon className="size-4" />
                </span>
                <Link to={card.to} className="after:absolute after:inset-0">
                  {card.title}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
              <ul className="text-muted-foreground mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {card.bullets.map((bullet) => (
                  <li key={bullet.id}>{bullet.content}</li>
                ))}
              </ul>
              <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
                Read the docs{" "}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
        <div className="bg-card p-6">
          <Compass className="text-primary mb-3 size-5" />
          <h3 className="text-sm font-semibold">Sidebar navigation</h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            Use the sidebar to jump between Overview, Installation, Configuration, and ready-made
            Examples for each card.
          </p>
        </div>
        <div className="bg-card border-t p-6 md:border-t-0 md:border-l">
          <Search className="text-primary mb-3 size-5" />
          <h3 className="text-sm font-semibold">Search the docs</h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            Find any page, option, or example in seconds. Press{" "}
            <kbd className="border-input bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>{" "}
            (or{" "}
            <kbd className="border-input bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
              Ctrl K
            </kbd>
            ) anywhere to jump straight in.
          </p>
        </div>
        <div className="bg-card border-t p-6 md:border-t-0 md:border-l">
          <HeartHandshake className="text-primary mb-3 size-5" />
          <h3 className="text-sm font-semibold">Contribute</h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            Found a bug or have an idea? Read the{" "}
            <Link to="/contributing" className="text-primary underline underline-offset-2">
              contributing guide
            </Link>{" "}
            to set up the monorepo locally.
          </p>
        </div>
      </div>
    </>
  );
}
