import { createFileRoute } from "@tanstack/react-router";

import {
  CardPlayground,
  defaultPlayground,
  type PlaygroundState,
} from "@/components/docs/card-playground";
import { PageHeader } from "@/components/docs/doc-primitives";

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

export const Route = createFileRoute("/_docs/power-flow-card-plus/playground")({
  // A broken or missing setup in the link falls back to the default one.
  validateSearch: (search: Record<string, unknown>): { s?: PlaygroundState } =>
    isPlaygroundState(search.s) ? { s: search.s } : {},
  component: Playground,
});

function Playground() {
  const { s } = Route.useSearch();
  return (
    <>
      <PageHeader
        eyebrow="Power Flow Card Plus"
        title="Playground"
        description="The real card, rendered as on a Home Assistant dashboard. Edit the config, move the sensors and watch the flows; the URL keeps your setup, so you can share it."
      />
      <CardPlayground initial={s ?? defaultPlayground()} />
    </>
  );
}
