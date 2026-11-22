import { createFileRoute } from "@tanstack/react-router";

import { DistributionAlternativeGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/energy-distribution-card-alternative")({
  component: DistributionAlternativeGuide,
});
