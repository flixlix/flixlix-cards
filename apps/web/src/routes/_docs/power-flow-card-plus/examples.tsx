import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/card-docs-content";

export const Route = createFileRoute("/_docs/power-flow-card-plus/examples")({
  component: () => <ExamplesPage cardKey="power" />,
});
