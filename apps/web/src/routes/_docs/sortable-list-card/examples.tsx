import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/sortable-list-card-docs-content";

export const Route = createFileRoute("/_docs/sortable-list-card/examples")({
  component: ExamplesPage,
});
