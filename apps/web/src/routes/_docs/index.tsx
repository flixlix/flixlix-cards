import { Link, createFileRoute } from "@tanstack/react-router";
import { GripVertical } from "lucide-react";
import * as React from "react";

import { CardDemo } from "@/components/card-demo";
import { CardPreview } from "@/components/card-preview";
import { houseDay } from "@/components/demos";
import { SegmentedControl } from "@/components/segmented-control";
import { cn } from "cn";
import { Button } from "@flixlix-cards/ui/components/button";

export const Route = createFileRoute("/_docs/")({
  component: IndexPage,
});

type DocLink = { label: string; to: string };

type CardSlug =
  | "power-flow-card-plus"
  | "home-flow-card"
  | "energy-flow-card-plus"
  | "energy-breakdown-card"
  | "energy-period-selector-plus"
  | "sortable-list-card";

type CardEntry = {
  slug: CardSlug;
  title: string;
  summary: React.ReactNode;
  preview: React.ReactNode;
  pages: ("installation" | "configuration" | "examples" | "playground")[];
  note?: string;
};

type Group = { id: string; title: string; lead: React.ReactNode; cards: CardEntry[] };

const ALL_PAGES: CardEntry["pages"] = ["installation", "configuration", "examples", "playground"];
const NO_PLAYGROUND: CardEntry["pages"] = ["installation", "configuration", "examples"];

const PAGE_LABELS: Record<CardEntry["pages"][number], string> = {
  installation: "Install",
  configuration: "Configure",
  examples: "Examples",
  playground: "Playground",
};

const GROUPS: Group[] = [
  {
    id: "live-power",
    title: "What's flowing right now",
    lead: "Live power in watts and kilowatts, redrawn every time a sensor changes.",
    cards: [
      {
        slug: "power-flow-card-plus",
        title: "Power Flow Card Plus",
        summary:
          "The classic flow diagram: grid, solar, battery and home as circles, with up to four of your own devices. A drop-in replacement for Home Assistant's distribution card, with far more to tune.",
        preview: <CardDemo demo="power" width={400} />,
        pages: ALL_PAGES,
      },
      {
        slug: "home-flow-card",
        title: "Home Flow Card",
        summary:
          "The same sensors, drawn as a little isometric house. Solar on the roof, the battery on the wall, the grid out at the street, and power pulsing between them.",
        preview: <CardDemo demo="house" width={400} />,
        pages: ALL_PAGES,
      },
    ],
  },
  {
    id: "energy-period",
    title: "How much over a day, a week, a year",
    lead: "Accumulated energy in kilowatt-hours for the period you pick. The period selector sets it for every energy card on the dashboard.",
    cards: [
      {
        slug: "energy-flow-card-plus",
        title: "Energy Flow Card Plus",
        summary:
          "The flow diagram again, this time adding up what moved over the selected period. Reads Home Assistant's energy collections, including extra dashboards.",
        preview: <CardDemo demo="energy" width={400} />,
        pages: ALL_PAGES,
      },
      {
        slug: "energy-breakdown-card",
        title: "Energy Breakdown Card",
        summary:
          "Where the energy went, as a donut or a stacked bar, with an optional legend of values and shares. Small consumers can be folded into one slice.",
        preview: (
          <Scaled scale={0.72}>
            <CardDemo demo="breakdown" width={420} />
          </Scaled>
        ),
        pages: NO_PLAYGROUND,
        note: "Custom HACS repository",
      },
      {
        slug: "energy-period-selector-plus",
        title: "Energy Period Selector Plus",
        summary:
          "Day, week, month, year or a custom range in Home Assistant's own calendar, plus previous, next and compare buttons. Drives both cards above.",
        preview: <CardDemo demo="selector" width={400} />,
        pages: ALL_PAGES,
      },
    ],
  },
  {
    id: "beyond-energy",
    title: "Beyond energy",
    lead: "Not every dashboard problem is about watts.",
    cards: [
      {
        slug: "sortable-list-card",
        title: "Sortable List Card",
        summary:
          "A list you reorder by dragging, saved through any service call you like. Made for load priorities in a home energy manager, and just as good for rooms or chores.",
        preview: <SortableListSketch />,
        pages: NO_PLAYGROUND,
        note: "Custom HACS repository",
      },
    ],
  },
];

/**
 * Scales a live card down while keeping the surrounding layout honest: `transform` leaves the
 * layout box at full size, so the wrapper takes the scaled height measured from the card.
 * A transform, not CSS `zoom`: Chrome draws a zoomed card's flow dots off their lines.
 */
function Scaled({ scale, children }: { scale: number; children: React.ReactNode }) {
  const inner = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<{ width: number; height: number }>();

  React.useEffect(() => {
    const element = inner.current;
    if (!element) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={size ? { width: size.width * scale, height: size.height * scale } : undefined}
      className="relative"
    >
      <div
        ref={inner}
        style={{ transform: `scale(${scale})` }}
        className="absolute top-0 left-0 w-max origin-top-left"
      >
        {children}
      </div>
    </div>
  );
}

const PRIORITIES = ["EV charger", "Heat pump", "Water heater", "Pool pump"];

function SortableListSketch() {
  return (
    <div className="bg-card w-72 rounded-xl border p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="mb-3 text-sm font-medium">Surplus solar goes to</div>
      <ol className="space-y-1.5">
        {PRIORITIES.map((name, index) => (
          <li
            key={name}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              index === 1 ? "bg-background -rotate-1 shadow-md" : "bg-card"
            )}
          >
            <span className="text-muted-foreground w-3 text-xs tabular-nums">{index + 1}</span>
            <span className="flex-1">{name}</span>
            <GripVertical aria-hidden className="text-muted-foreground size-4" />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The hero card as it first renders, the afternoon, captured from the card itself: shown until the
 * live card has loaded after hydration, so the swap only starts the pulses. Images, not a second
 * card: the cards cannot render on the server. Recapture when the card or the first moment changes.
 */
function HouseSnapshot() {
  return (
    <>
      <img
        src="/previews/house-afternoon-light.webp"
        alt=""
        width={460}
        height={357}
        fetchPriority="high"
        className="h-auto w-full dark:hidden"
      />
      <img
        src="/previews/house-afternoon-dark.webp"
        alt=""
        width={460}
        height={357}
        fetchPriority="high"
        className="hidden h-auto w-full dark:block"
      />
    </>
  );
}

const MOMENT_LABELS = ["Afternoon", "Evening", "Night", "Outage"];

const MOMENTS = houseDay.moments.map((moment, index) => ({
  ...moment,
  value: moment.name,
  label: MOMENT_LABELS[index] ?? moment.name,
}));

const HERO_CONFIGS = [houseDay.config];

function HeroHouse() {
  const [selected, setSelected] = React.useState(MOMENTS[0]?.value ?? "");
  const moment = MOMENTS.find((m) => m.value === selected) ?? MOMENTS[0];
  if (!moment) {
    return null;
  }

  return (
    <figure className="flex min-w-0 flex-col items-center">
      {/* The card's own ground glow is wider than the card and gets clipped into a box; it is
          turned off and redrawn here, at the same place and size, where nothing clips it. */}
      <div className="relative w-fit max-w-full [&_home-flow-card]:[--house-ground:transparent]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[21%] left-[-38%] h-[108%] w-[144%] bg-[radial-gradient(closest-side,var(--hero-ground),color-mix(in_oklab,var(--hero-ground)_60%,transparent)_70%,transparent)] [--hero-ground:color-mix(in_oklab,var(--foreground)_7%,var(--background))] dark:[--hero-ground:color-mix(in_oklab,var(--foreground)_16%,var(--background))]"
        />
        <CardPreview
          configs={HERO_CONFIGS}
          states={moment.states}
          width={460}
          bare
          fallback={<HouseSnapshot />}
          className="relative max-w-full"
        />
      </div>
      <SegmentedControl
        legend="Time of day"
        options={MOMENTS}
        value={moment.value}
        onChange={setSelected}
        className="mt-5"
      />
      <figcaption
        aria-live="polite"
        className="text-muted-foreground mt-3 min-h-[2.75rem] max-w-sm text-center text-sm leading-snug text-balance"
      >
        <span
          key={moment.value}
          className="block transition-[opacity,filter,translate] duration-300 ease-(--ease-out-strong) starting:translate-y-1 starting:opacity-0 starting:blur-[2px] motion-reduce:starting:translate-y-0"
        >
          {moment.caption}
        </span>
      </figcaption>
    </figure>
  );
}

function pageLinks(card: CardEntry): DocLink[] {
  return card.pages.map((page) => ({
    label: PAGE_LABELS[page],
    to: `/${card.slug}/${page}`,
  }));
}

function CardRow({ card }: { card: CardEntry }) {
  return (
    <article className="grid grid-cols-1 items-center gap-x-12 gap-y-6 py-10 first:pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="max-w-md">
        <h3 className="text-xl font-semibold tracking-[-0.015em]">
          <Link
            to={`/${card.slug}`}
            className="decoration-solar underline-offset-[5px] hover:underline"
          >
            {card.title}
          </Link>
        </h3>
        {card.note ? <p className="text-muted-foreground mt-1 text-xs">{card.note}</p> : null}
        <p className="text-foreground/80 mt-3 text-[15px] leading-relaxed text-pretty">
          {card.summary}
        </p>
        <nav aria-label={`${card.title} docs`} className="mt-5 flex flex-wrap gap-1.5">
          {pageLinks(card).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="press bg-card hover:bg-accent rounded-full border px-3 py-1 text-[13px] font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex min-w-0 justify-center lg:justify-end" inert>
        {card.preview}
      </div>
    </article>
  );
}

function IndexPage() {
  return (
    <div className="pb-8">
      <section className="grid grid-cols-1 items-center gap-x-12 gap-y-10 pt-4 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:pt-10 lg:pb-24">
        <div>
          <h1 className="max-w-[13ch] text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em] md:text-[3.75rem]">
            Lovelace cards for the power in your home
          </h1>
          <p className="text-foreground/75 mt-6 max-w-[46ch] text-lg leading-relaxed text-pretty">
            See where your power comes from and where it goes, live on your Home Assistant
            dashboard. Solar, battery, grid and the devices in between, clear at a glance and
            beautiful enough to leave on the wall tablet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <a href="#live-power">Pick a card</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <a
                href="https://github.com/flixlix/flixlix-cards"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            Free and MIT licensed. Installs through HACS, configures in the dashboard editor.
          </p>
        </div>
        <HeroHouse />
      </section>

      {GROUPS.map((group) => (
        <section key={group.id} id={group.id} className="scroll-mt-20 border-t pt-12 pb-6">
          <div className="mb-6 grid grid-cols-1 gap-x-12 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
            <h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">
              {group.title}
            </h2>
            <p className="text-muted-foreground max-w-md text-[15px] leading-relaxed lg:pt-1.5">
              {group.lead}
            </p>
          </div>
          <div className="divide-y">
            {group.cards.map((card) => (
              <CardRow key={card.slug} card={card} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-6 border-t pt-12">
        <h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">
          Something missing?
        </h2>
        <p className="text-foreground/80 mt-3 max-w-[60ch] text-[15px] leading-relaxed">
          Every card lives in one repository.{" "}
          <a
            href="https://github.com/flixlix/flixlix-cards/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-solar font-medium underline underline-offset-4"
          >
            Open an issue
          </a>{" "}
          for a bug or an idea, or{" "}
          <Link
            to="/contributing"
            className="decoration-solar font-medium underline underline-offset-4"
          >
            set up the monorepo
          </Link>{" "}
          and send a pull request. Press{" "}
          <kbd className="bg-card rounded border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> to search
          every option on this site.
        </p>
      </section>
    </div>
  );
}
