import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/breakdown-card-docs-content";

export const Route = createFileRoute("/_docs/energy-breakdown-card/examples")({
  component: ExamplesPage,
});
