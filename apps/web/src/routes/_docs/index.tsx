import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ChartPie,
  Compass,
  Github,
  HeartHandshake,
  ListOrdered,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import * as React from "react";

import { HeroFlow } from "@/components/hero-flow";
import { cn } from "@flixlix-cards/cn";
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
  bullets: React.ReactNode[];
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
      <video
        key="/videos/power-demo.mp4"
        src="/videos/power-demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-label="Power Flow Card Plus demo"
        className="mx-auto block h-44 w-full object-contain"
      />
    ),
    description: (
      <>
        Visualizes <strong>instantaneous</strong> power distribution (W / kW). Best for live
        dashboards where you want to see what is flowing right now.
      </>
    ),
    bullets: [
      "UI editor & YAML support",
      "Up to 4 individual devices",
      <>Bidirectional grid &amp; battery flows</>,
      "Power outage handling and templates",
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
      <video
        key="/videos/energy-demo.mp4"
        src="/videos/energy-demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-label="Energy Flow Card Plus demo"
        className="mx-auto block h-44 w-full object-contain"
      />
    ),
    description: (
      <>
        Visualizes <strong>accumulated</strong> energy values (Wh / kWh) for the selected dashboard
        period (today, week, custom range, etc.).
      </>
    ),
    bullets: [
      "Binds to Home Assistant energy collections",
      "Same flexible config style as Power Flow",
      <>
        Multiple dashboard support via <code>collection_key</code>
      </>,
      "Translatable labels in 14+ languages",
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
      <img
        src="/images/energy-breakdown-demo.png"
        alt="Energy Breakdown Card"
        className="h-full w-full max-w-60 object-contain"
      />
    ),
    description: (
      <>
        Visualizes how your energy use is <strong>broken down</strong> across sources, as a donut or
        stacked bar. Pairs well with the energy dashboard's selected period.
      </>
    ),
    bullets: [
      "Donut and stacked-bar variants",
      "Optional legend with values & percentages",
      <>
        <code>group_others</code> + <code>max_items</code> to keep things tidy
      </>,
      "Custom HACS repository (not yet in the default index)",
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
      "Drag or use arrows to reorder",
      "Persist via any service with placeholders",
      "Entity-backed items (name, icon, state)",
      "Custom HACS repository (not yet in the default index)",
    ],
  },
];

function IndexPage() {
  return (
    <>
      <section className="from-card to-background relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-b">
        <div className="bg-grid-faint absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="bg-primary/10 absolute -top-24 right-0 size-80 rounded-full blur-3xl" />

        <div className="relative grid items-center gap-x-10 gap-y-8 p-8 md:p-12 lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div>
            <p className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-wide">
              <Zap className="size-3" /> Open source · HACS · Home Assistant
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

          <HeroFlow className="mx-auto w-full max-w-105 lg:max-w-none" />
        </div>
      </section>

      <h2 className="mb-1 text-2xl font-semibold tracking-tight">The cards</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Four cards, one goal: making your dashboard worth looking at.
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
            <div className="bg-muted/50 flex h-44 items-center justify-center border-b">
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
                {card.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
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
