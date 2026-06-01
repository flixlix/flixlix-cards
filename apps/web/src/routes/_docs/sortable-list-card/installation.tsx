import { createFileRoute } from "@tanstack/react-router";

import { InstallationPage } from "@/components/docs/sortable-list-card-docs-content";

export const Route = createFileRoute("/_docs/sortable-list-card/installation")({
  component: InstallationPage,
});
