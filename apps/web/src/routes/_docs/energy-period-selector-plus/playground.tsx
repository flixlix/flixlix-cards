import { createFileRoute } from "@tanstack/react-router";

import {
  CardPlayground,
  defaultPlayground,
  validatePlaygroundSearch,
} from "@/components/docs/card-playground";
import { PageHeader } from "@/components/docs/doc-primitives";

export const Route = createFileRoute("/_docs/energy-period-selector-plus/playground")({
  validateSearch: validatePlaygroundSearch,
  component: Playground,
});

function Playground() {
  const { s } = Route.useSearch();
  return (
    <>
      <PageHeader
        eyebrow="Energy Period Selector Plus"
        title="Playground"
        description="The real card driving an Energy Flow Card Plus, as on a Home Assistant dashboard. Edit the selector's config and pick periods; the URL keeps your setup, so you can share it."
      />
      <CardPlayground kind="period" initial={s ?? defaultPlayground("period")} />
    </>
  );
}
