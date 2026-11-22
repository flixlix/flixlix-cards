import * as React from "react";
import { parse } from "yaml";

import { type CardConfig, CardPreview } from "@/components/card-preview";
import { type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";

import { CodeBlock } from "./doc-primitives";

const isConfig = (value: unknown): value is CardConfig =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

/** The cards a config draws: a stack is drawn as its cards, one under another. */
const cardsOf = (config: unknown): CardConfig[] => {
  if (!isConfig(config)) {
    return [];
  }
  if (Array.isArray(config.cards)) {
    return config.cards.filter(isConfig);
  }
  return [config];
};

/** An example config next to the card it draws, over the given states. */
export function LiveExample({
  code,
  states,
  energy = false,
  width = 400,
}: {
  code: string;
  states: StateFixtures;
  energy?: boolean;
  width?: number;
}) {
  const configs = React.useMemo(() => cardsOf(parse(code)), [code]);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <CodeBlock language="yaml" code={code} />
      {configs.length > 0 ? (
        <CardPreview
          configs={configs}
          states={states}
          energy={energy}
          width={width}
          className="mx-auto w-fit max-w-full rounded-2xl"
        />
      ) : null}
    </div>
  );
}
