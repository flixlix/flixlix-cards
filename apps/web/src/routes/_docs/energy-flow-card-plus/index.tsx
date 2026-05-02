import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/components/docs/card-docs-content";

export const Route = createFileRoute("/_docs/energy-flow-card-plus/")({
  component: () => <OverviewPage cardKey="energy" />,
});
