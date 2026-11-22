import { PageLinks } from "./doc-primitives";

export type GuideLink = { to: string; title: string; description: string };

export const GUIDE_LINKS = [
  {
    to: "/guides",
    title: "Which card to use",
    description: "Live watts, an isometric house, period energy, a donut, a date picker or a list.",
  },
  {
    to: "/guides/solar-battery-power-flow",
    title: "Solar and battery power flow",
    description: "The sensors and a first config for live power on a Lovelace dashboard.",
  },
  {
    to: "/guides/power-flow-card-plus-vs-power-flow-card",
    title: "Vs the original Power Flow Card",
    description: "ulic75's Power Flow Card is archived, and its README points here.",
  },
  {
    to: "/guides/power-flow-card-plus-vs-sunsynk",
    title: "Vs the Sunsynk Power Flow Card",
    description: "A circle diagram for any sensors, or a card that copies an inverter screen.",
  },
  {
    to: "/guides/power-flow-card-plus-vs-tesla-style",
    title: "Vs Tesla Style Solar Power Card",
    description: "How each card wants its solar, battery and grid sensors wired up.",
  },
  {
    to: "/guides/energy-distribution-card-alternative",
    title: "Energy Distribution alternative",
    description: "Live watts, or the same period energy as the built-in card with more to tune.",
  },
] as const satisfies readonly GuideLink[];

const link = (path: string) => {
  const found = GUIDE_LINKS.find((entry) => entry.to === path);
  if (!found) {
    throw new Error(`Missing guide link ${path}`);
  }
  return found;
};

export function RelatedGuides({ paths }: { paths: readonly string[] }) {
  return <PageLinks links={paths.map(link)} />;
}
