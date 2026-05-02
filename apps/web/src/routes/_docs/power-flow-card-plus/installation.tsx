import { createFileRoute } from "@tanstack/react-router";

import { InstallationPage } from "@/components/docs/card-docs-content";

export const Route = createFileRoute("/_docs/power-flow-card-plus/installation")({
  component: () => <InstallationPage cardKey="power" />,
});
