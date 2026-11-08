import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { parse, stringify } from "yaml";

import { CardPreview, type CardConfig } from "@/components/card-preview";
import {
  type Demo,
  energyDemo,
  energyFlowCard,
  energyStates,
  houseMoments,
  periodSelector,
  powerDemo,
} from "@/components/demos";
import { sensor, type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";
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

/**
 * Power: live readings in W. Home: the same readings on Home Flow Card's house. Energy: daily
 * usage, over a period picked above the card. Period: the period selector itself, driving an
 * Energy Flow Card Plus below it.
 */
export type PlaygroundKind = "power" | "home" | "energy" | "period";

type FlowKind = Exclude<PlaygroundKind, "period" | "home">;

const CARD_TYPES: Record<FlowKind, string> = {
  power: "custom:power-flow-card-plus",
  energy: "custom:energy-flow-card-plus",
};

const DEMOS: Record<FlowKind, Demo> = { power: powerDemo, energy: energyDemo };

/** The period selector's README examples and the options worth trying. */
const periodPresets = (): Preset[] =>
  [
    { name: "every period, on a card", config: periodSelector },
    {
      name: "titled, icon buttons, month / year / custom",
      config: {
        type: "custom:energy-period-selector-plus",
        card_background: true,
        title: "Energy period",
        today_button_type: "icon",
        compare_button_type: "icon",
        period_buttons: ["month", "year", "custom"],
      },
    },
    {
      name: "compare as text",
      config: { ...periodSelector, compare_button_type: "text" },
    },
    {
      name: "date picker in every period",
      config: {
        ...periodSelector,
        date_picker: true,
        period_buttons: ["day", "week", "month", "year", "custom"],
      },
    },
    {
      name: "bare, without a card",
      config: { type: "custom:energy-period-selector-plus", prev_next_buttons: false },
    },
  ].map(({ name, config }) => ({
    name,
    state: { yaml: stringify(config), states: energyStates, width: 500 },
  }));

/** A test scenario's power readings as daily energy: the same numbers, in Wh. */
const asDailyEnergy = (states: StateFixtures): StateFixtures =>
  Object.fromEntries(
    Object.entries(states).map(([id, fixture]) => {
      const state = typeof fixture === "string" ? fixture : fixture.state;
      const unit = typeof fixture === "string" ? "W" : fixture.attributes.unit_of_measurement;
      return [id, unit === "W" ? sensor(state, { unit: "Wh" }) : fixture];
    })
  );

type Preset = { name: string; state: PlaygroundState };

/** A day on the house, then setups worth trying: solar alone, and the card standing still. */
const homePresets = (): Preset[] => {
  const [afternoon] = houseMoments;
  const extra = afternoon
    ? [
        {
          name: "Solar only",
          config: { type: "custom:home-flow-card", solar: { entity: "sensor.solar_power" } },
          states: { "sensor.solar_power": "2400" },
        },
        {
          name: "Still: plain numbers, no pulses",
          config: { ...afternoon.config, animate_numbers: false, disable_dots: true },
          states: afternoon.states,
        },
      ]
    : [];
  return [...houseMoments, ...extra].map(({ name, config, states }) => ({
    name,
    state: { yaml: stringify(config), states, width: 440 },
  }));
};

const presets = (kind: PlaygroundKind): Preset[] => {
  if (kind === "period") {
    return periodPresets();
  }
  if (kind === "home") {
    return homePresets();
  }
  const demo = DEMOS[kind];
  const realistic: Preset = {
    name: kind === "power" ? "a sunny afternoon" : "an average day",
    state: {
      yaml: stringify(demo.configs[demo.configs.length - 1]),
      states: demo.states,
      width: 500,
    },
  };
  const scenarios = flowScenarios
    .filter((scenario) => kind === "power" || scenario.energy)
    .map((scenario) => ({
      name: scenario.name,
      state: {
        yaml: stringify({
          type: CARD_TYPES[kind],
          ...(kind === "energy" ? { energy_date_selection: true } : {}),
          ...scenario.options,
          entities: scenario.entities,
        }),
        states: kind === "energy" ? asDailyEnergy(scenario.states) : scenario.states,
        templates: scenario.templates,
        width: scenario.width ?? 500,
      },
    }));
  return [realistic, ...scenarios];
};

export const defaultPlayground = (kind: PlaygroundKind): PlaygroundState => {
  const [first] = presets(kind);
  if (!first) {
    throw new Error("no playground presets");
  }
  return first.state;
};

const isPlaygroundState = (value: unknown): value is PlaygroundState =>
  typeof value === "object" &&
  value !== null &&
  "yaml" in value &&
  typeof value.yaml === "string" &&
  "states" in value &&
  typeof value.states === "object" &&
  value.states !== null &&
  "width" in value &&
  typeof value.width === "number";

/** Route search for a playground: a broken or missing setup in the link means the default one. */
export const validatePlaygroundSearch = (
  search: Record<string, unknown>
): { s?: PlaygroundState } => (isPlaygroundState(search.s) ? { s: search.s } : {});

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

/** A sensor's unit; a bare state is a power reading in W, as `sensor` makes it. */
const unitOf = (fixture: StateFixtures[string]) =>
  typeof fixture === "string" ? "W" : fixture.attributes.unit_of_measurement;

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
  signed,
}: {
  entityId: string;
  value: string;
  onChange: (value: string) => void;
  /** Whether the reading can go negative, like a combined grid or battery sensor. */
  signed: boolean;
}) {
  const number = Number.parseFloat(value);
  // ponytail: the range is fixed around the first value; type a number for anything outside it.
  const [range] = React.useState(() => Math.abs(number) * 2 || 1000);
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
          min={signed ? -range : 0}
          max={range}
          step={range / 200}
          value={[number]}
          onValueChange={([next]) => onChange(String(next))}
        />
      ) : null}
    </div>
  );
}

/**
 * A live flow card with an editable config and sliders for every sensor. The energy card sits
 * under a period selector, as on a dashboard, and follows the period picked there.
 */
export function CardPlayground({
  kind,
  initial,
}: {
  kind: PlaygroundKind;
  initial: PlaygroundState;
}) {
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
  const configs = React.useMemo(() => {
    if (!config) {
      return [];
    }
    return {
      power: [config],
      home: [config],
      energy: [periodSelector, config],
      period: [config, energyFlowCard],
    }[kind];
  }, [config, kind]);
  const scenarios = React.useMemo(() => presets(kind), [kind]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Panel title="Scenario">
          <Select
            onValueChange={(index) => {
              const preset = scenarios[Number(index)];
              if (preset) {
                update(preset.state);
              }
            }}
          >
            <SelectTrigger aria-label="Scenario">
              <SelectValue placeholder="Load a scenario…" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((preset, index) => (
                <SelectItem key={preset.name} value={String(index)}>
                  {preset.name}
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
        <Panel
          title="Sensor states"
          aside={
            <span className="text-muted-foreground font-mono text-xs">
              {kind === "power" || kind === "home" ? "W" : "on an average day"}
            </span>
          }
        >
          <div className="flex flex-col gap-5">
            {Object.entries(state.states).map(([entityId, fixture]) => (
              <StateControl
                key={entityId}
                entityId={entityId}
                value={stateOf(fixture)}
                signed={(kind === "power" || kind === "home") && unitOf(fixture) === "W"}
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
            configs={configs}
            states={state.states}
            templates={state.templates}
            energy={kind === "energy" || kind === "period"}
            width={state.width}
            className="rounded-xl border"
          />
        ) : null}
      </div>
    </div>
  );
}
