import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/power-flow-house-card-docs-content";

export const Route = createFileRoute("/_docs/power-flow-house-card/examples")({
  component: ExamplesPage,
});
