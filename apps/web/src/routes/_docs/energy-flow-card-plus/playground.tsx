import { createFileRoute } from "@tanstack/react-router";

import {
  CardPlayground,
  defaultPlayground,
  validatePlaygroundSearch,
} from "@/components/docs/card-playground";
import { PageHeader } from "@/components/docs/doc-primitives";

export const Route = createFileRoute("/_docs/energy-flow-card-plus/playground")({
  validateSearch: validatePlaygroundSearch,
  component: Playground,
});

function Playground() {
  const { s } = Route.useSearch();
  return (
    <>
      <PageHeader
        eyebrow="Energy Flow Card Plus"
        title="Playground"
        description="The real card under Energy Period Selector Plus, as on a Home Assistant dashboard. Pick a period, edit the config and set each sensor's daily usage; the URL keeps your setup, so you can share it."
      />
      <CardPlayground kind="energy" initial={s ?? defaultPlayground("energy")} />
    </>
  );
}
