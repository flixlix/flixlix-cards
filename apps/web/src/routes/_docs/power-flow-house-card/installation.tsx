import { createFileRoute } from "@tanstack/react-router";

import { InstallationPage } from "@/components/docs/power-flow-house-card-docs-content";

export const Route = createFileRoute("/_docs/power-flow-house-card/installation")({
  component: InstallationPage,
});
