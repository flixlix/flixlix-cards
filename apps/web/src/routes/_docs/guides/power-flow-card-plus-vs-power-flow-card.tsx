import { createFileRoute } from "@tanstack/react-router";

import { VersusOriginalGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/power-flow-card-plus-vs-power-flow-card")({
  component: VersusOriginalGuide,
});
