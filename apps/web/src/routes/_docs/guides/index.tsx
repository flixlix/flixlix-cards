import { createFileRoute } from "@tanstack/react-router";

import { WhichCardGuide } from "@/components/docs/guide-pages";

export const Route = createFileRoute("/_docs/guides/")({
  component: WhichCardGuide,
});
