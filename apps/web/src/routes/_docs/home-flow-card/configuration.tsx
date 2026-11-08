import { createFileRoute } from "@tanstack/react-router";

import { ConfigurationPage } from "@/components/docs/home-flow-card-docs-content";

export const Route = createFileRoute("/_docs/home-flow-card/configuration")({
  component: ConfigurationPage,
});
