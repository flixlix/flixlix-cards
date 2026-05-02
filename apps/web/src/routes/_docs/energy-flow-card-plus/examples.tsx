import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/card-docs-content";

export const Route = createFileRoute("/_docs/energy-flow-card-plus/examples")({
  component: () => <ExamplesPage cardKey="energy" />,
});
