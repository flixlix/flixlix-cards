import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/home-flow-card-docs-content";

export const Route = createFileRoute("/_docs/home-flow-card/examples")({
  component: ExamplesPage,
});
