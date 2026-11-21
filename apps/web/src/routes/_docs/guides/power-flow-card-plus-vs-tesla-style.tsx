import { createFileRoute } from "@tanstack/react-router";

import { VersusTeslaGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/power-flow-card-plus-vs-tesla-style")({
  component: VersusTeslaGuide,
});
