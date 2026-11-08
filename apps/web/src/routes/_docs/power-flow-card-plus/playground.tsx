import { createFileRoute } from "@tanstack/react-router";

import {
  CardPlayground,
  defaultPlayground,
  validatePlaygroundSearch,
} from "@/components/docs/card-playground";
import { PageHeader } from "@/components/docs/doc-primitives";

export const Route = createFileRoute("/_docs/power-flow-card-plus/playground")({
  validateSearch: validatePlaygroundSearch,
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
      <CardPlayground kind="power" initial={s ?? defaultPlayground("power")} />
    </>
  );
}
