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
    import("power-flow-card-plus/source"),
  ]).then(([elements, hass]) => {
    elements.defineHaElements();
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
 * A card rendered as on a Home Assistant dashboard: Home Assistant's theme, its `ha-card`, and a
 * fake `hass` holding the given states. No Home Assistant needed.
 */
export function CardPreview({
  config,
  states,
  templates,
  width = 500,
  className,
}: {
  config: CardConfig;
  states: StateFixtures;
  templates?: Record<string, string>;
  width?: number;
  className?: string;
}) {
  const dashboard = React.useRef<HTMLDivElement>(null);
  const host = React.useRef<HTMLDivElement>(null);
  const hass = React.useRef<HomeAssistant>(undefined);
  const [preview, setPreview] = React.useState<Preview>();
  const [loadError, setLoadError] = React.useState<string>();
  const scheme = useDocsScheme();

  React.useEffect(() => {
    loadPreview().then(setPreview, (cause: unknown) => setLoadError(errorText(cause)));
  }, []);

  // A new card per config, as Home Assistant does when a card's config changes.
  const created = React.useMemo(() => (preview ? createCard(config) : {}), [preview, config]);

  React.useEffect(() => {
    if (preview && dashboard.current) {
      dashboard.current.style.cssText = preview.haDashboardStyle(scheme);
    }
  }, [preview, scheme]);

  // Mounts the card, then hands it a new `hass` per state change that keeps the connection, as
  // Home Assistant does.
  React.useEffect(() => {
    const { card: next, setHass } = created;
    if (!preview || !next || !setHass || !host.current) {
      return;
    }
    if (next.parentElement !== host.current) {
      host.current.replaceChildren(next);
    }
    hass.current = hass.current
      ? preview.withStates(hass.current, states)
      : preview.fakeHass({ states, templates });
    setHass(hass.current);
  }, [preview, created, states, templates]);

  const error = loadError ?? created.error;
  return (
    <div ref={dashboard} className={cn("overflow-hidden rounded-lg p-4", className)}>
      <div ref={host} data-card-preview style={{ width, maxWidth: "100%" }} />
      {error ? <pre className="text-destructive text-sm whitespace-pre-wrap">{error}</pre> : null}
    </div>
  );
}
