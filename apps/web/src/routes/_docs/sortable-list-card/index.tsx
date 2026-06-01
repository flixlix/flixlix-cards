import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/components/docs/sortable-list-card-docs-content";

export const Route = createFileRoute("/_docs/sortable-list-card/")({
  component: OverviewPage,
});
