import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/components/docs/breakdown-card-docs-content";

export const Route = createFileRoute("/_docs/energy-breakdown-card/")({
  component: OverviewPage,
});
