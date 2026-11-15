import { createFileRoute } from "@tanstack/react-router";

import { VersusSunsynkGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/power-flow-card-plus-vs-sunsynk")({
  component: VersusSunsynkGuide,
});
