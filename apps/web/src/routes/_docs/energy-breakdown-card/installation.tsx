import { createFileRoute } from "@tanstack/react-router";

import { InstallationPage } from "@/components/docs/breakdown-card-docs-content";

export const Route = createFileRoute("/_docs/energy-breakdown-card/installation")({
  component: InstallationPage,
});
