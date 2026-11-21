import { createFileRoute } from "@tanstack/react-router";

import {
  CardPlayground,
  defaultPlayground,
  validatePlaygroundSearch,
} from "@/components/docs/card-playground";
import { PageHeader } from "@/components/docs/doc-primitives";
import { heading } from "@/lib/page-meta";

export const Route = createFileRoute("/_docs/home-flow-card/playground")({
  validateSearch: validatePlaygroundSearch,
  component: Playground,
});

function Playground() {
  const { s } = Route.useSearch();
  return (
    <>
      <PageHeader
        eyebrow="Home Flow Card"
        title={heading("/home-flow-card/playground")}
        description="Your house, live. Pick a moment of the day, drag the sensors and watch the wires, the numbers and the battery follow; the URL keeps your setup, so you can share it."
      />
      <CardPlayground kind="home" initial={s ?? defaultPlayground("home")} />
    </>
  );
}
