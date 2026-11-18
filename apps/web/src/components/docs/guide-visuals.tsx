import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import * as React from "react";

import { type CardConfig, CardPreview } from "@/components/card-preview";
import { type Demo } from "@/components/demos";
import { SegmentedControl } from "@/components/segmented-control";
import { type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";
import { Button } from "@flixlix-cards/ui/components/button";
import { cn } from "cn";

import { CodeBlock } from "./doc-primitives";
import { LiveExample } from "./live-example";

const FADE_IN =
  "transition-[opacity,filter,translate] duration-300 ease-(--ease-out-strong) starting:translate-y-1 starting:opacity-0 starting:blur-[2px] motion-reduce:starting:translate-y-0";

const CARD_FRAME = "mx-auto w-fit max-w-full rounded-2xl";

/** Text with a live card beside it, the card below the text on narrow screens. */
export function Split({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">{children}</div>
      {aside}
    </div>
  );
}

export function DemoFigure({
  demo,
  caption,
  width = 400,
}: {
  demo: Demo;
  caption: string;
  width?: number;
}) {
  return (
    <figure data-llms-skip className="mx-auto flex w-fit max-w-full min-w-0 flex-col gap-3">
      <CardPreview
        configs={demo.configs}
        states={demo.states}
        energy={demo.energy}
        width={width}
        className={CARD_FRAME}
      />
      <figcaption className="text-muted-foreground w-0 min-w-full px-1 text-center text-sm text-balance">
        {caption}
      </figcaption>
    </figure>
  );
}

const reading = (fixture: StateFixtures[string]) =>
  typeof fixture === "string"
    ? { state: fixture, unit: "W" }
    : { state: fixture.state, unit: fixture.attributes.unit_of_measurement ?? "" };

function StateReadout({ states }: { states: StateFixtures }) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-stone-800 bg-stone-950 font-mono text-xs text-stone-200 shadow-sm dark:border-white/10">
      <div className="border-b border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-medium text-stone-400">
        What the sensors report
      </div>
      <dl className="py-2">
        {Object.entries(states).map(([entity, fixture]) => {
          const { state, unit } = reading(fixture);
          return (
            <div key={entity} className="flex items-baseline justify-between gap-6 px-3.5 py-1">
              <dt className="truncate text-stone-400">{entity}</dt>
              <dd className="shrink-0 tabular-nums">
                <span key={state} className={cn("inline-block", FADE_IN)}>
                  {state}
                </span>{" "}
                <span className="text-stone-500">{unit}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export type Moment = { value: string; label: string; caption: string; states: StateFixtures };

/** One card over a few moments: pick a moment and the card redraws from its sensor states. */
export function MomentsDemo({
  legend,
  config,
  moments,
  width = 400,
  className,
}: {
  legend: string;
  config: CardConfig;
  moments: readonly Moment[];
  width?: number;
  className?: string;
}) {
  const configs = React.useMemo(() => [config], [config]);
  const [selected, setSelected] = React.useState(moments[0]?.value ?? "");
  const moment = moments.find((entry) => entry.value === selected) ?? moments[0];
  if (!moment) {
    return null;
  }
  return (
    <figure data-llms-skip className={cn("flex min-w-0 flex-col items-center gap-5", className)}>
      <SegmentedControl
        legend={legend}
        options={moments}
        value={moment.value}
        onChange={setSelected}
      />
      <div className="grid w-full grid-cols-1 items-center justify-items-center gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,24rem)_auto] lg:justify-center">
        <StateReadout states={moment.states} />
        <CardPreview
          configs={configs}
          states={moment.states}
          width={width}
          className={CARD_FRAME}
        />
      </div>
      <figcaption
        aria-live="polite"
        className="text-muted-foreground min-h-10 max-w-md text-center text-sm leading-snug text-balance"
      >
        <span key={moment.value} className={cn("block", FADE_IN)}>
          {moment.caption}
        </span>
      </figcaption>
    </figure>
  );
}

export type Variant = { value: string; label: string; code: string; caption: string };

/** The same sensor states under a few configs: pick one to see its YAML and what it draws. */
export function VariantExample({
  legend,
  variants,
  states,
}: {
  legend: string;
  variants: readonly Variant[];
  states: StateFixtures;
}) {
  const [selected, setSelected] = React.useState(variants[0]?.value ?? "");
  const variant = variants.find((entry) => entry.value === selected) ?? variants[0];
  if (!variant) {
    return null;
  }
  return (
    <figure data-llms-skip className="flex min-w-0 flex-col gap-3">
      <SegmentedControl
        legend={legend}
        options={variants}
        value={variant.value}
        onChange={setSelected}
        className="self-start"
      />
      <LiveExample code={variant.code} states={states} />
      <figcaption aria-live="polite" className="text-muted-foreground min-h-10 text-sm">
        <span key={variant.value} className={cn("block", FADE_IN)}>
          {variant.caption}
        </span>
      </figcaption>
    </figure>
  );
}

export type CardChoice = {
  value: string;
  label: string;
  title: string;
  to: string;
  shows: string;
  demo: Demo;
};

/** Pick what you want to see and get the card that shows it, live. */
export function CardPicker({ choices }: { choices: readonly CardChoice[] }) {
  const [selected, setSelected] = React.useState(choices[0]?.value ?? "");
  const choice = choices.find((entry) => entry.value === selected) ?? choices[0];
  if (!choice) {
    return null;
  }
  return (
    <figure data-llms-skip className="bg-card mb-10 max-w-4xl overflow-hidden rounded-2xl border">
      <fieldset className="flex flex-wrap gap-2 border-b p-4">
        <legend className="sr-only">What do you want to see?</legend>
        {choices.map((entry) => (
          <Button
            key={entry.value}
            size="sm"
            variant={entry.value === choice.value ? "secondary" : "outline"}
            aria-pressed={entry.value === choice.value}
            onClick={() => setSelected(entry.value)}
          >
            {entry.label}
          </Button>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 items-center gap-6 p-4 md:min-h-[30rem] md:grid-cols-[minmax(0,1fr)_auto] md:p-6">
        <figcaption
          key={`${choice.value}-text`}
          aria-live="polite"
          className={cn("min-w-0", FADE_IN)}
        >
          <div className="text-lg font-semibold tracking-[-0.01em]">{choice.title}</div>
          <p className="text-foreground/85 mt-2 max-w-[44ch] text-[15px] leading-relaxed">
            {choice.shows}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to={choice.to}>
              Open {choice.title} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </figcaption>
        {/* Keyed: a preview keeps the fake Home Assistant it started with, energy data or not. */}
        <CardPreview
          key={choice.value}
          configs={choice.demo.configs}
          states={choice.demo.states}
          energy={choice.demo.energy}
          width={choice.demo.width ?? 400}
          className={CARD_FRAME}
        />
      </div>
    </figure>
  );
}

export type ConfigSide = { title: string; code: string; note: React.ReactNode };

/** Two cards' YAML for the same setup, side by side. */
export function ConfigCompare({ sides }: { sides: readonly [ConfigSide, ConfigSide] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {sides.map((side) => (
        <div key={side.title} className="min-w-0">
          <CodeBlock language="yaml" filename={side.title} code={side.code} />
          <p className="text-muted-foreground [&_code]:bg-muted px-1 text-sm leading-relaxed [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px]">
            {side.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CompareTable({
  columns,
  rows,
}: {
  columns: readonly [string, string];
  rows: readonly { label: string; left: React.ReactNode; right: React.ReactNode }[];
}) {
  return (
    <div className="max-w-3xl overflow-x-auto rounded-xl border">
      <table className="[&_code]:bg-muted w-full text-left text-sm [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px]">
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Compared</span>
            </th>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="text-muted-foreground px-4 py-3 align-top font-normal">
                {row.label}
              </th>
              <td className="px-4 py-3 align-top">{row.left}</td>
              <td className="px-4 py-3 align-top">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type SensorTile = { icon: LucideIcon; name: string; unit: string; note: string };

export function SensorTiles({ sensors }: { sensors: readonly SensorTile[] }) {
  return (
    <ul className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
      {sensors.map((sensor) => (
        <li key={sensor.name} className="bg-card flex gap-3 rounded-xl border p-4">
          <sensor.icon aria-hidden className="text-solar-ink mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{sensor.name}</span>
              <span className="text-muted-foreground font-mono text-xs">{sensor.unit}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{sensor.note}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type EntityList = { title: string; summary: string; entities: readonly string[] };

/** What each card asks you to wire up, entity by entity. */
export function EntityLists({ lists }: { lists: readonly [EntityList, EntityList] }) {
  return (
    <div className="grid max-w-3xl grid-cols-1 items-start gap-4 md:grid-cols-2">
      {lists.map((list) => (
        <div key={list.title} className="bg-card rounded-xl border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{list.title}</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {list.entities.length} entities
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{list.summary}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {list.entities.map((entity) => (
              <li
                key={entity}
                className="bg-muted rounded-md px-2 py-1 font-mono text-[11.5px] break-all"
              >
                {entity}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export type CardPick = { title: string; points: readonly string[]; link: React.ReactNode };

export function PickCards({ picks }: { picks: readonly [CardPick, CardPick] }) {
  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      {picks.map((pick) => (
        <div key={pick.title} className="bg-card flex flex-col rounded-xl border p-4">
          <div className="font-medium">{pick.title}</div>
          <ul className="text-foreground/85 mt-2 flex-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {pick.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="[&_a]:decoration-solar mt-3 text-sm [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4">
            {pick.link}
          </div>
        </div>
      ))}
    </div>
  );
}
