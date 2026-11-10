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
    import("home-flow-card/source"),
    import("energy-flow-card-plus/source"),
    import("energy-breakdown-card/source"),
    import("energy-period-selector-plus/source"),
    import("sortable-list-card/source"),
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

/**
 * Takes the card's chrome away and gives it the page's colour, which cards like Home Flow Card
 * shade themselves from, so what they draw blends into the page.
 */
const BARE_CARD_VARIABLES: Record<`--${string}`, string> = {
  "--card-background-color": "var(--background)",
  "--ha-card-background": "transparent",
  "--ha-card-border-width": "0",
  "--ha-card-box-shadow": "none",
};

// Rendered with the page as well as set with the theme: a card styled before them would fade its
// default background out (ha-card transitions everything), a flash on a dark page.
const BARE_CARD_STYLE = `${Object.entries(BARE_CARD_VARIABLES)
  .map(([name, value]) => `${name}: ${value};`)
  .join(" ")} background: transparent;`;

/** Resolves once a Lit card has rendered its latest properties. */
const updated = (card: HTMLElement): Promise<unknown> =>
  "updateComplete" in card && card.updateComplete instanceof Promise
    ? card.updateComplete
    : Promise.resolve();

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
  bare = false,
  fallback,
  width = 500,
  className,
}: {
  configs: readonly CardConfig[];
  states: StateFixtures;
  templates?: Record<string, string>;
  energy?: boolean;
  /** The cards straight on the page: no dashboard around them and no card behind them. */
  bare?: boolean;
  /**
   * Shown in the cards' place until they have rendered, which is only after hydration: give it
   * the cards' size and the page doesn't shift when they appear.
   */
  fallback?: React.ReactNode;
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
  const [rendered, setRendered] = React.useState(false);
  const scheme = useDocsScheme();

  React.useEffect(() => {
    loadPreview().then(setPreview, (cause: unknown) => setLoadError(errorText(cause)));
  }, []);

  // New cards per config, as Home Assistant does when a card's config changes.
  const created = React.useMemo(() => (preview ? configs.map(createCard) : []), [preview, configs]);

  React.useEffect(() => {
    if (preview && dashboard.current) {
      dashboard.current.style.cssText =
        preview.haDashboardStyle(scheme) + (bare ? BARE_CARD_STYLE : "");
    }
    // Cards that shade themselves for a dark theme read it from `hass`, as in Home Assistant.
    if (preview && hass.current) {
      hass.current = preview.withDarkMode(hass.current, scheme === "dark");
      for (const { setHass } of created) {
        setHass?.(hass.current);
      }
    }
  }, [preview, scheme, created, bare]);

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
        darkMode: scheme === "dark",
        energyCollection,
        statistics: (window) => growthOver(latestStates.current, window),
      });
    }
    for (const { setHass } of created) {
      setHass?.(hass.current);
    }
  }, [preview, created, states, templates, energy, scheme]);

  React.useEffect(() => {
    const cards = created.flatMap(({ card }) => (card ? [card] : []));
    if (!preview || cards.length === 0) {
      return undefined;
    }
    let cancelled = false;
    void Promise.all(cards.map(updated)).then(() =>
      // Two frames more for cards that size their labels after their first render.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) {
            setRendered(true);
          }
        })
      )
    );
    return () => {
      cancelled = true;
    };
  }, [preview, created]);

  const error = loadError ?? created.find((card) => card.error)?.error;
  return (
    <div
      ref={dashboard}
      style={bare ? BARE_CARD_VARIABLES : undefined}
      className={cn(!bare && "overflow-hidden rounded-lg p-4", className)}
    >
      <div className="grid">
        <div
          ref={host}
          data-card-preview
          className={cn(
            "flex flex-col gap-2 [grid-area:1/1]",
            fallback !== undefined &&
              "transition-opacity duration-300 ease-(--ease-out-strong) motion-reduce:transition-none",
            fallback !== undefined && !rendered && "opacity-0"
          )}
          style={{ width, maxWidth: "100%" }}
        />
        {fallback === undefined ? null : (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none transition-opacity duration-300 ease-(--ease-out-strong) [grid-area:1/1] motion-reduce:transition-none",
              rendered && "opacity-0"
            )}
            style={{ width, maxWidth: "100%" }}
          >
            {fallback}
          </div>
        )}
      </div>
      {error ? <pre className="text-destructive text-sm whitespace-pre-wrap">{error}</pre> : null}
    </div>
  );
}
