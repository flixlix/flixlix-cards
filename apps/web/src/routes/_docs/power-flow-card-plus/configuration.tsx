import { createFileRoute } from "@tanstack/react-router";

import { ConfigurationPage } from "@/components/docs/card-docs-content";

export const Route = createFileRoute("/_docs/power-flow-card-plus/configuration")({
  component: () => <ConfigurationPage cardKey="power" />,
});
