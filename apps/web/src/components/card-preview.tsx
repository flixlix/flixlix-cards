import { type HomeAssistant } from "custom-card-helpers";
import * as React from "react";

import { type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";
import { cn } from "cn";

type CardElement = HTMLElement & { hass?: HomeAssistant; setConfig(config: object): void };

export type CardConfig = { type: string } & Record<string, unknown>;

// Lit and the cards only run in the browser; load them after hydration.
const loadPreview = () =>
  Promise.all([
    import("@flixlix-cards/shared/preview/ha-elements"),
    import("@flixlix-cards/shared/preview/fake-hass"),
    import("@flixlix-cards/shared/preview/date-range-picker"),
    import("power-flow-card-plus/source"),
    import("energy-flow-card-plus/source"),
    import("energy-breakdown-card/source"),
    import("energy-period-selector-plus/source"),
  ]).then(([elements, hass, picker]) => {
    elements.defineHaElements();
    picker.defineDateRangePicker();
    return { haDashboardStyle: elements.haDashboardStyle, ...hass };
  });

type Preview = Awaited<ReturnType<typeof loadPreview>>;

const isCard = (element: HTMLElement): element is CardElement =>
  "setConfig" in element && typeof element.setConfig === "function";

const errorText = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

type CreatedCard = { card?: CardElement; setHass?: (hass: HomeAssistant) => void; error?: string };

/** The card element for a config, configured as Home Assistant does before handing it `hass`. */
const createCard = (config: CardConfig): CreatedCard => {
  const card = document.createElement(config.type.replace(/^custom:/, ""));
  if (!isCard(card)) {
    return { error: `Unknown card type: ${config.type}` };
  }
  try {
    card.setConfig(config);
    return {
      card,
      setHass: (hass) => {
        card.hass = hass;
      },
    };
  } catch (cause) {
    return { error: errorText(cause) };
  }
};

const useDocsScheme = () =>
  React.useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light" as const
  );

const DAY = 86_400_000;

/** A steady pseudo-random factor per day, so periods differ the way real days do. */
const dayFactor = (time: number) => {
  const seed = Math.sin(Math.floor(time / DAY) * 12.9898) * 43_758.5453;
  return 0.75 + 0.5 * (seed - Math.floor(seed));
};

const stateNumber = (fixture: StateFixtures[string]) =>
  Number(typeof fixture === "string" ? fixture : fixture.state);

/** Wh per unit of an energy sensor; statistics are always fetched in Wh. */
const WATT_HOURS: Record<string, number> = { Wh: 1, kWh: 1000, MWh: 1_000_000 };

const wattHoursPer = (fixture: StateFixtures[string]) =>
  typeof fixture === "string"
    ? undefined
    : WATT_HOURS[String(fixture.attributes.unit_of_measurement)];

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * What the energy statistics hold for a period, in Wh: every energy sensor's state is its usage
 * on an average day, and each day of the period varies around it.
 */
const growthOver = (states: StateFixtures, { start, end }: { start: Date; end: Date }) => {
  // Like Home Assistant, there are no statistics after today.
  const last = Math.min(end.getTime(), startOfToday().getTime() + DAY);
  const days = Math.max(0, Math.round((last - start.getTime()) / DAY));
  const factor = Array.from({ length: days }, (_, day) =>
    dayFactor(start.getTime() + day * DAY)
  ).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    Object.entries(states).flatMap(([id, fixture]) => {
      const perUnit = wattHoursPer(fixture);
      return perUnit ? [[id, Math.round(stateNumber(fixture) * perUnit * factor)]] : [];
    })
  );
};

/**
 * Cards rendered as on a Home Assistant dashboard, stacked like a vertical stack: Home Assistant's
 * theme, its `ha-card`, and one fake `hass` holding the given states. With `energy`, the dashboard
 * also has an energy collection set to today, and energy sensors' states are their daily usage.
 */
export function CardPreview({
  configs,
  states,
  templates,
  energy = false,
  width = 500,
  className,
}: {
  configs: readonly CardConfig[];
  states: StateFixtures;
  templates?: Record<string, string>;
  energy?: boolean;
  width?: number;
  className?: string;
}) {
  const dashboard = React.useRef<HTMLDivElement>(null);
  const host = React.useRef<HTMLDivElement>(null);
  const hass = React.useRef<HomeAssistant>(undefined);
  const latestStates = React.useRef(states);
  const collection = React.useRef<{ refresh: () => void }>(undefined);
  const [preview, setPreview] = React.useState<Preview>();
  const [loadError, setLoadError] = React.useState<string>();
  const scheme = useDocsScheme();

  React.useEffect(() => {
    loadPreview().then(setPreview, (cause: unknown) => setLoadError(errorText(cause)));
  }, []);

  // New cards per config, as Home Assistant does when a card's config changes.
  const created = React.useMemo(() => (preview ? configs.map(createCard) : []), [preview, configs]);

  React.useEffect(() => {
    if (preview && dashboard.current) {
      dashboard.current.style.cssText = preview.haDashboardStyle(scheme);
    }
  }, [preview, scheme]);

  // Mounts the cards, then hands them a new `hass` per state change that keeps the connection, as
  // Home Assistant does; energy cards refetch their statistics.
  React.useEffect(() => {
    const cards = created.flatMap(({ card }) => (card ? [card] : []));
    if (!preview || !host.current) {
      return;
    }
    const mounted = [...host.current.children];
    if (mounted.length !== cards.length || cards.some((card, index) => mounted[index] !== card)) {
      host.current.replaceChildren(...cards);
    }
    latestStates.current = states;
    if (hass.current) {
      hass.current = preview.withStates(hass.current, states);
      collection.current?.refresh();
    } else {
      const energyCollection = energy
        ? preview.energyCollection(startOfToday(), new Date(startOfToday().getTime() + DAY - 1))
        : undefined;
      collection.current = energyCollection;
      hass.current = preview.fakeHass({
        states,
        templates,
        energyCollection,
        statistics: (window) => growthOver(latestStates.current, window),
      });
    }
    for (const { setHass } of created) {
      setHass?.(hass.current);
    }
  }, [preview, created, states, templates, energy]);

  const error = loadError ?? created.find((card) => card.error)?.error;
  return (
    <div ref={dashboard} className={cn("overflow-hidden rounded-lg p-4", className)}>
      <div
        ref={host}
        data-card-preview
        className="flex flex-col gap-2"
        style={{ width, maxWidth: "100%" }}
      />
      {error ? <pre className="text-destructive text-sm whitespace-pre-wrap">{error}</pre> : null}
    </div>
  );
}
