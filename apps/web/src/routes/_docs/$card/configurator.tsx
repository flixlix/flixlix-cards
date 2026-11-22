/* oxlint-disable typescript/only-throw-error -- TanStack Router signals redirect and not-found by throwing a Response */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_docs/$card/configurator")({
  beforeLoad: ({ params }) => {
    switch (params.card) {
      case "power-flow-card-plus":
        throw redirect({ to: "/power-flow-card-plus/playground", statusCode: 301 });
      case "energy-flow-card-plus":
        throw redirect({ to: "/energy-flow-card-plus/playground", statusCode: 301 });
      case "home-flow-card":
        throw redirect({ to: "/home-flow-card/playground", statusCode: 301 });
      case "energy-period-selector-plus":
        throw redirect({ to: "/energy-period-selector-plus/playground", statusCode: 301 });
      case "energy-breakdown-card":
        throw redirect({ to: "/energy-breakdown-card", statusCode: 301 });
      case "sortable-list-card":
        throw redirect({ to: "/sortable-list-card", statusCode: 301 });
      default:
        throw notFound();
    }
  },
});
