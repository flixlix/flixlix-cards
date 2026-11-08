import { createFileRoute } from "@tanstack/react-router";

import { InstallationPage } from "@/components/docs/home-flow-card-docs-content";

export const Route = createFileRoute("/_docs/home-flow-card/installation")({
  component: InstallationPage,
});
