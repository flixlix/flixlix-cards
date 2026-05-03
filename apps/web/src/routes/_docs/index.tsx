import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ChartPie, Github, Sparkles, Zap } from "lucide-react";

import { PageHeader } from "@/components/docs/doc-primitives";
import { Button } from "@flixlix-cards/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flixlix-cards/ui/components/card";

export const Route = createFileRoute("/_docs/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <>
      <PageHeader
        eyebrow="flixlix-cards"
        title="Beautiful flow cards for Home Assistant"
        description={
          <>
            Customizable Power and Energy flow cards that visualize the live distribution between
            grid, solar, battery, home, and individual devices in your dashboard. This site
            documents how to install, configure, and contribute to each card.
          </>
        }
        badges={[{ label: "HACS" }, { label: "Home Assistant" }, { label: "Open source" }]}
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/power-flow-card-plus">
            Get started <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href="https://github.com/flixlix/flixlix-cards"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-4" /> GitHub
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden pt-0!">
          <div className="bg-muted/50 border-b">
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
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-5" /> Power Flow Card Plus
            </CardTitle>
            <CardDescription>
              Visualizes <strong>instantaneous</strong> power distribution (W / kW). Best for live
              dashboards where you want to see what is flowing right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
            <ul className="list-disc space-y-1 pl-5">
              <li>UI editor & YAML support</li>
              <li>Up to 4 individual devices</li>
              <li>Bidirectional grid &amp; battery flows</li>
              <li>Power outage handling and templates</li>
            </ul>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link to="/power-flow-card-plus">
                Read the docs <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden pt-0!">
          <div className="bg-muted/50 border-b">
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
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" /> Energy Flow Card Plus
            </CardTitle>
            <CardDescription>
              Visualizes <strong>accumulated</strong> energy values (Wh / kWh) for the selected
              dashboard period (today, week, custom range, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
            <ul className="list-disc space-y-1 pl-5">
              <li>Binds to Home Assistant energy collections</li>
              <li>Same flexible config style as Power Flow</li>
              <li>
                Multiple dashboard support via <code>collection_key</code>
              </li>
              <li>Translatable labels in 14+ languages</li>
            </ul>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link to="/energy-flow-card-plus">
                Read the docs <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden pt-0!">
          <div className="bg-muted/50 flex h-44 items-center justify-center border-b">
            <img
              src="/images/energy-breakdown-demo.png"
              alt="Energy Breakdown Card"
              className="h-full max-w-60 w-full object-contain"
            />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartPie className="size-5" /> Energy Breakdown Card
            </CardTitle>
            <CardDescription>
              Visualizes how your energy use is <strong>broken down</strong> across sources, as a
              donut or stacked bar. Pairs well with the energy dashboard's selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
            <ul className="list-disc space-y-1 pl-5">
              <li>Donut and stacked-bar variants</li>
              <li>Optional legend with values & percentages</li>
              <li>
                <code>group_others</code> + <code>max_items</code> to keep things tidy
              </li>
              <li>Custom HACS repository (not yet in the default index)</li>
            </ul>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link to="/energy-breakdown-card">
                Read the docs <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sidebar navigation</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Use the sidebar to jump between Overview, Installation, Configuration, and ready-made
            Examples for each card.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search the docs</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Find any page, section, configuration option, or example in seconds. Press{" "}
            <kbd className="border-input bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>{" "}
            (or{" "}
            <kbd className="border-input bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
              Ctrl K
            </kbd>
            ) anywhere to jump straight in.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contribute</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Found a bug or have an idea? Read the{" "}
            <Link to="/contributing" className="text-primary underline underline-offset-2">
              contributing guide
            </Link>{" "}
            to set up the monorepo locally.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
