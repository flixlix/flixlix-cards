import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { parse, stringify } from "yaml";

import { CardPreview, type CardConfig } from "@/components/card-preview";
import { type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";
import { flowScenarios } from "@flixlix-cards/shared/testing/flow-scenarios";
import { Input } from "@flixlix-cards/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flixlix-cards/ui/components/select";
import { Slider } from "@flixlix-cards/ui/components/slider";
import { Textarea } from "@flixlix-cards/ui/components/textarea";

/** Everything the playground shows; serialised into the URL so a setup can be shared. */
export type PlaygroundState = {
  yaml: string;
  states: StateFixtures;
  templates?: Record<string, string>;
  width: number;
};

const CARD_TYPE = "custom:power-flow-card-plus";

const fromScenario = (scenario: (typeof flowScenarios)[number]): PlaygroundState => ({
  yaml: stringify({ type: CARD_TYPE, ...scenario.options, entities: scenario.entities }),
  states: scenario.states,
  templates: scenario.templates,
  width: scenario.width ?? 500,
});

export const defaultPlayground = (): PlaygroundState => {
  const scenario =
    flowScenarios.find((candidate) => candidate.name.startsWith("solver regression")) ??
    flowScenarios[0];
  if (!scenario) {
    throw new Error("no flow scenarios");
  }
  return fromScenario(scenario);
};

const isCardConfig = (value: unknown): value is CardConfig =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

const parseConfig = (yaml: string): { config?: CardConfig; error?: string } => {
  try {
    const value: unknown = parse(yaml);
    return isCardConfig(value) ? { config: value } : { error: "The config needs a `type`." };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : String(cause) };
  }
};

const stateOf = (fixture: StateFixtures[string]) =>
  typeof fixture === "string" ? fixture : fixture.state;

const withState = (fixture: StateFixtures[string], state: string): StateFixtures[string] =>
  typeof fixture === "string" ? state : { ...fixture, state };

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StateControl({
  entityId,
  value,
  onChange,
}: {
  entityId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const number = Number.parseFloat(value);
  // ponytail: the range is fixed around the first value; type a number for anything outside it.
  const [range] = React.useState(() => Math.max(1000, Math.abs(number) * 2 || 0));
  const inputId = `state-${entityId}`;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-muted-foreground truncate font-mono text-xs">
          {entityId}
        </label>
        <Input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-24 text-right font-mono text-xs tabular-nums"
        />
      </div>
      {Number.isFinite(number) ? (
        <Slider
          aria-label={entityId}
          min={-range}
          max={range}
          step={range / 200}
          value={[number]}
          onValueChange={([next]) => onChange(String(next))}
        />
      ) : null}
    </div>
  );
}

/** A live power-flow-card-plus with an editable config and sliders for every sensor. */
export function CardPlayground({ initial }: { initial: PlaygroundState }) {
  const [state, setState] = React.useState(initial);
  const update = (next: Partial<PlaygroundState>) =>
    setState((previous) => ({ ...previous, ...next }));

  // Write the setup to the URL once the user pauses: a navigation per slider step is too slow.
  const navigate = useNavigate();
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void navigate({ to: ".", search: { s: state }, replace: true, resetScroll: false });
    }, 400);
    return () => clearTimeout(timeout);
  }, [navigate, state]);

  const parsed = React.useMemo(() => parseConfig(state.yaml), [state.yaml]);
  // Keep showing the last valid config while the YAML is being edited.
  const [config, setConfig] = React.useState(parsed.config);
  if (parsed.config && parsed.config !== config) {
    setConfig(parsed.config);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Panel title="Scenario">
          <Select
            onValueChange={(index) => {
              const scenario = flowScenarios[Number(index)];
              if (scenario) {
                update(fromScenario(scenario));
              }
            }}
          >
            <SelectTrigger aria-label="Scenario">
              <SelectValue placeholder="Load a scenario…" />
            </SelectTrigger>
            <SelectContent>
              {flowScenarios.map((scenario, index) => (
                <SelectItem key={scenario.name} value={String(index)}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>
        <Panel
          title="Config"
          aside={<span className="text-muted-foreground font-mono text-xs">YAML</span>}
        >
          <Textarea
            aria-label="Card config (YAML)"
            value={state.yaml}
            onChange={(event) => update({ yaml: event.target.value })}
            spellCheck={false}
            aria-invalid={parsed.error ? true : undefined}
            className="min-h-64 font-mono text-xs leading-relaxed"
          />
          {parsed.error ? (
            <p className="text-destructive mt-2 font-mono text-xs whitespace-pre-wrap">
              {parsed.error}
            </p>
          ) : null}
        </Panel>
        <Panel title="Sensor states">
          <div className="flex flex-col gap-5">
            {Object.entries(state.states).map(([entityId, fixture]) => (
              <StateControl
                key={entityId}
                entityId={entityId}
                value={stateOf(fixture)}
                onChange={(value) =>
                  setState((previous) => ({
                    ...previous,
                    states: { ...previous.states, [entityId]: withState(fixture, value) },
                  }))
                }
              />
            ))}
          </div>
        </Panel>
        <Panel
          title="Card width"
          aside={
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {state.width}px
            </span>
          }
        >
          <Slider
            aria-label="Card width"
            min={250}
            max={800}
            value={[state.width]}
            onValueChange={([width]) => width !== undefined && update({ width })}
          />
        </Panel>
      </div>
      <div className="xl:sticky xl:top-20 xl:self-start">
        {config ? (
          <CardPreview
            // A new fake connection when the templates change.
            key={JSON.stringify(state.templates ?? {})}
            config={config}
            states={state.states}
            templates={state.templates}
            width={state.width}
            className="rounded-xl border"
          />
        ) : null}
      </div>
    </div>
  );
}
