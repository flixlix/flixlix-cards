import { createFileRoute } from "@tanstack/react-router";

import { ExamplesPage } from "@/components/docs/energy-period-selector-plus-docs-content";

export const Route = createFileRoute("/_docs/energy-period-selector-plus/examples")({
  component: ExamplesPage,
});
