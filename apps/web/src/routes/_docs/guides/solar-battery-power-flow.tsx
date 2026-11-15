import { createFileRoute } from "@tanstack/react-router";

import { SolarBatteryGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/solar-battery-power-flow")({
  component: SolarBatteryGuide,
});
