import { createFileRoute } from "@tanstack/react-router";

import { CardDemo, type CardDemoName } from "@/components/card-demo";
import { isOgImage, OG_IMAGE_SIZE, type OgImage } from "@/lib/og-images";

type OgCard = {
  eyebrow: string;
  title: string;
  tagline: string;
  demo: CardDemoName;
  zoom?: number;
};

const OG_CARDS: Record<OgImage, OgCard> = {
  general: {
    eyebrow: "Home Assistant energy cards",
    title: "flixlix-cards",
    tagline: "Open-source Lovelace cards that show where your home's power comes from and goes.",
    demo: "house",
  },
  power: {
    eyebrow: "Home Assistant card",
    title: "Power Flow Card Plus",
    tagline: "Live power flowing between grid, solar, battery, your home and your devices.",
    demo: "power",
  },
  house: {
    eyebrow: "Home Assistant card",
    title: "Home Flow Card",
    tagline: "Your own little isometric home, with your live power flowing through it.",
    demo: "house",
  },
  energy: {
    eyebrow: "Home Assistant card",
    title: "Energy Flow Card Plus",
    tagline: "Where your energy came from and where it went, over any day, week or year.",
    demo: "energy",
  },
  breakdown: {
    eyebrow: "Home Assistant card",
    title: "Energy Breakdown Card",
    tagline: "Which devices used your energy, as a donut or a bar, for any period.",
    demo: "breakdown",
    zoom: 0.72,
  },
  period: {
    eyebrow: "Home Assistant card",
    title: "Energy Period Selector Plus",
    tagline: "Pick the day, week, month or year every energy card on the dashboard shows.",
    demo: "period",
  },
  sortable: {
    eyebrow: "Home Assistant card",
    title: "Sortable List Card",
    tagline: "Drag any list into order and save it to Home Assistant, like your loads' priority.",
    demo: "sortable",
  },
};

export const Route = createFileRoute("/og/$image")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: OgImagePage,
});

function OgImagePage() {
  const { image } = Route.useParams();
  return isOgImage(image) ? <OgFrame card={OG_CARDS[image]} /> : null;
}

function OgFrame({ card }: { card: OgCard }) {
  const { eyebrow, title, tagline, demo, zoom = 1 } = card;
  return (
    <div
      data-og-frame
      className="bg-background text-foreground relative flex items-center gap-12 overflow-hidden px-16"
      style={OG_IMAGE_SIZE}
    >
      <div
        aria-hidden
        className="bg-solar/20 pointer-events-none absolute -top-40 -right-24 size-[520px] rounded-full blur-3xl"
      />
      <div className="relative flex h-full w-[500px] shrink-0 flex-col justify-center gap-6 py-16">
        <p className="text-muted-foreground text-2xl font-medium">{eyebrow}</p>
        <h1 className="text-[4rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
          {title}
        </h1>
        <p className="text-foreground/75 text-[1.75rem] leading-snug text-pretty">{tagline}</p>
        <p className="mt-auto flex items-center gap-3 text-2xl font-medium">
          <img src="/favicon.svg" alt="" className="size-9" />
          cards.flixlix.com
        </p>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <div style={{ zoom }}>
          <CardDemo demo={demo} className="rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
