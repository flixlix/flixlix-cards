import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Github, Play } from "lucide-react";
import type * as React from "react";
import { stringify } from "yaml";

import { trackEvent } from "#/lib/analytics";
import { CardDemo, type CardDemoName } from "@/components/card-demo";
import { CardPreview } from "@/components/card-preview";
import { type Demo } from "@/components/demos";
import { Button } from "@flixlix-cards/ui/components/button";
import { cn } from "cn";

import { PageLinks, Prose, Section } from "./doc-primitives";
import { HomeAssistantIcon } from "./home-assistant-icon";

export type OverviewDemo = { name: string; caption: string; demo: Demo };

export function CardHero({
  title,
  demo,
  installHref,
  playgroundTo,
  children,
}: {
  title: string;
  demo: CardDemoName;
  installHref: string;
  playgroundTo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-8">
        {children}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a
              href={installHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("Open in Home Assistant", { card: title })}
            >
              <HomeAssistantIcon /> Install in Home Assistant
            </a>
          </Button>
          {playgroundTo ? (
            <Button asChild variant="outline">
              <Link to={playgroundTo}>
                <Play /> Try it in the playground
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <figure className="mx-auto flex w-fit max-w-full min-w-0 flex-col gap-2 lg:mx-0">
        <CardDemo demo={demo} className="max-w-full rounded-2xl" />
        <figcaption className="text-muted-foreground w-0 min-w-full text-center text-sm">
          Not a screenshot: the real card, running right here.
        </figcaption>
      </figure>
    </div>
  );
}

export function DemoGallery({
  title,
  description,
  demos,
  playgroundTo,
}: {
  title: string;
  description?: React.ReactNode;
  demos: OverviewDemo[];
  playgroundTo?: string;
}) {
  return (
    <Section id="demos" title={title} description={description}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {demos.map((item, index) => (
          <figure
            key={item.name}
            className={cn(
              "mx-auto flex w-fit max-w-full min-w-0 flex-col gap-3",
              demos.length % 2 === 1 && index === demos.length - 1 && "md:col-span-2"
            )}
          >
            <CardPreview
              configs={item.demo.configs}
              states={item.demo.states}
              energy={item.demo.energy}
              width={400}
              className="mx-auto w-fit max-w-full rounded-2xl"
            />
            <figcaption className="flex w-0 min-w-full items-start justify-between gap-3 px-1">
              <div>
                <div className="text-sm font-semibold">{item.name}</div>
                <p className="text-muted-foreground text-sm">{item.caption}</p>
              </div>
              {playgroundTo && item.demo.configs.length === 1 ? (
                <Button asChild size="sm" variant="ghost" className="shrink-0">
                  <Link
                    to={playgroundTo}
                    search={{
                      s: {
                        yaml: stringify(item.demo.configs[0]),
                        states: item.demo.states,
                        width: 440,
                      },
                    }}
                  >
                    Play <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function Highlights({ children }: { children: React.ReactNode }) {
  return (
    <Section title="Highlights">
      <ul className="text-foreground/85 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-1 text-[15px] md:grid-cols-2">
        {children}
      </ul>
    </Section>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-1">
      <Check aria-hidden className="text-solar-ink mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export function SectionPages({ basePath, playground }: { basePath: string; playground?: boolean }) {
  return (
    <Section title="What's in this section">
      <PageLinks
        links={[
          {
            to: `${basePath}/installation`,
            title: "Installation",
            description: "Marketplace, HACS or manual install.",
          },
          {
            to: `${basePath}/configuration`,
            title: "Configuration",
            description: "Every option, with defaults and types.",
          },
          {
            to: `${basePath}/examples`,
            title: "Examples",
            description: "Copy-pastable configs, each shown live.",
          },
          ...(playground
            ? [
                {
                  to: `${basePath}/playground`,
                  title: "Playground",
                  description: "Edit the config and drag the sensors; share the link.",
                },
              ]
            : []),
        ]}
      />
    </Section>
  );
}

export function SourceSection({ repoUrl }: { repoUrl: string }) {
  const repo = repoUrl.replace("https://github.com/", "");
  return (
    <Section title="Source & releases">
      <Prose>
        <p>
          Releases are published to{" "}
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
            {repo}
          </a>
          . The source, issues and feature requests live in the{" "}
          <a
            href="https://github.com/flixlix/flixlix-cards"
            target="_blank"
            rel="noopener noreferrer"
          >
            flixlix-cards monorepo
          </a>
          .
        </p>
      </Prose>
      <Button asChild variant="outline" size="sm">
        <a
          href="https://github.com/flixlix/flixlix-cards"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github /> View source on GitHub
        </a>
      </Button>
    </Section>
  );
}
