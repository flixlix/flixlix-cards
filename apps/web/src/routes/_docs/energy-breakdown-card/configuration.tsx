import { createFileRoute } from "@tanstack/react-router";

import { ConfigurationPage } from "@/components/docs/breakdown-card-docs-content";

export const Route = createFileRoute("/_docs/energy-breakdown-card/configuration")({
  component: ConfigurationPage,
});
