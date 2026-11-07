import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github, GripVertical } from "lucide-react";
import * as React from "react";

import { HeroFlow } from "@/components/hero-flow";
import { Button } from "@flixlix-cards/ui/components/button";

export const Route = createFileRoute("/_docs/")({
  component: IndexPage,
});

type CardEntry = {
  to:
    | "/power-flow-card-plus"
    | "/energy-flow-card-plus"
    | "/energy-breakdown-card"
    | "/sortable-list-card";
  title: string;
  /** Default HACS index, or a custom repository the user has to add first. */
  hacs: "default" | "custom";
  media: React.ReactNode;
  description: React.ReactNode;
};

const demoVideo = (src: string, label: string) => (
  <video
    key={src}
    src={src}
    autoPlay
    loop
    muted
    playsInline
    aria-label={label}
    className="h-full w-full object-contain"
  />
);

// ponytail: static stand-in until the sortable list card has a recorded demo.
const SORTABLE_MOCK = (
  <ol className="bg-card w-44 divide-y rounded-md border text-xs shadow-sm">
    {["Home battery", "EV charger", "Hot water"].map((item, i) => (
      <li key={item} className="flex items-center gap-2 px-2.5 py-2">
        <GripVertical className="text-muted-foreground size-3.5" />
        <span className="text-muted-foreground font-mono">{i + 1}</span>
        {item}
      </li>
    ))}
  </ol>
);

const CARDS: CardEntry[] = [
  {
    to: "/power-flow-card-plus",
    title: "Power Flow Card Plus",
    hacs: "default",
    media: demoVideo("/videos/power-demo.mp4", "Power Flow Card Plus demo"),
    description: (
      <>
        Live power (W / kW) moving between grid, solar, battery, home and up to four individual
        devices. For dashboards that show what is happening right now.
      </>
    ),
  },
  {
    to: "/energy-flow-card-plus",
    title: "Energy Flow Card Plus",
    hacs: "default",
    media: demoVideo("/videos/energy-demo.mp4", "Energy Flow Card Plus demo"),
    description: (
      <>
        The same diagram for accumulated energy (Wh / kWh), following the period picked on your
        energy dashboard: today, this week, or a custom range.
      </>
    ),
  },
  {
    to: "/energy-breakdown-card",
    title: "Energy Breakdown Card",
    hacs: "custom",
    media: (
      <img
        src="/images/energy-breakdown-demo.png"
        alt="Energy Breakdown Card"
        className="max-h-full w-full max-w-60 object-contain"
      />
    ),
    description: (
      <>
        Where your energy went, as a donut or stacked bar with an optional legend of values and
        percentages.
      </>
    ),
  },
  {
    to: "/sortable-list-card",
    title: "Sortable List Card",
    hacs: "custom",
    media: SORTABLE_MOCK,
    description: (
      <>
        A drag-and-drop list that saves its order through any service. Built for HEMS load
        priorities; works for any ranking.
      </>
    ),
  },
];

const SUBPAGES = [
  { label: "Install", path: "installation" },
  { label: "Configure", path: "configuration" },
  { label: "Examples", path: "examples" },
] as const;

function IndexPage() {
  return (
    <>
      <section className="grid items-center gap-x-12 gap-y-10 pt-4 pb-16 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Lovelace cards for Home Assistant
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
            See where your home's energy goes
          </h1>
          <p className="text-muted-foreground mt-4 max-w-lg text-base leading-relaxed">
            Animated flow diagrams between grid, solar, battery and your devices, plus a breakdown
            chart and a sortable priority list. Free, open source, installed through HACS.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to="/power-flow-card-plus/installation">
                Install Power Flow Card Plus <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <a
                href="https://github.com/flixlix/flixlix-cards"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" /> Source on GitHub
              </a>
            </Button>
          </div>
        </div>

        <HeroFlow className="mx-auto w-full max-w-96 lg:max-w-none" />
      </section>

      <h2 className="border-b pb-3 text-xl font-semibold tracking-tight">The cards</h2>

      <ul className="divide-y">
        {CARDS.map((card) => (
          <li key={card.to} className="grid gap-6 py-8 sm:grid-cols-[13rem_1fr]">
            <Link
              to={card.to}
              tabIndex={-1}
              aria-hidden
              className="bg-muted/60 flex h-36 items-center justify-center overflow-hidden rounded-md p-2"
            >
              {card.media}
            </Link>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold tracking-tight">
                  <Link to={card.to} className="hover:text-primary transition-colors">
                    {card.title}
                  </Link>
                </h3>
                <span className="text-muted-foreground text-xs">
                  {card.hacs === "default" ? "In the HACS default index" : "HACS custom repository"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                {card.description}
              </p>
              <nav
                aria-label={`${card.title} docs`}
                className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-4 text-sm font-medium"
              >
                {SUBPAGES.map((sub) => (
                  <Link
                    key={sub.path}
                    to={`${card.to}/${sub.path}`}
                    className="text-foreground/80 hover:text-primary transition-colors"
                  >
                    {sub.label}
                  </Link>
                ))}
              </nav>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-8 border-t pt-8 text-sm">
        Found a bug or want a feature? Open an issue on{" "}
        <a
          href="https://github.com/flixlix/flixlix-cards/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-4"
        >
          GitHub
        </a>
        , or read the{" "}
        <Link to="/contributing" className="text-foreground underline underline-offset-4">
          contributing guide
        </Link>{" "}
        to run the monorepo locally.
      </p>
    </>
  );
}
