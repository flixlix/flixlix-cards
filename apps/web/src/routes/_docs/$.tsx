/* oxlint-disable typescript/only-throw-error -- TanStack Router signals not-found by throwing a Response */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageHeader, PageLinks } from "@/components/docs/doc-primitives";
import { NOT_FOUND_META } from "@/lib/page-meta";

export const Route = createFileRoute("/_docs/$")({
  loader: () => {
    throw notFound();
  },
  head: () => ({
    meta: [
      { title: NOT_FOUND_META.title },
      { name: "description", content: NOT_FOUND_META.description },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title={NOT_FOUND_META.h1}
        description="That address is not a page on this site. The cards and the setup guides are below."
      />
      <PageLinks
        links={[
          {
            to: "/",
            title: "All cards",
            description: "Power flow, energy, the isometric house and the other Lovelace cards.",
          },
          {
            to: "/guides/solar-battery-power-flow",
            title: "Solar and battery power flow",
            description: "A first Home Assistant config for live grid, solar and battery power.",
          },
          {
            to: "/guides",
            title: "Which card to use",
            description: "Live watts, period energy, a donut, a date picker or a sortable list.",
          },
        ]}
      />
      <p className="text-muted-foreground mt-8 text-sm">
        The old <code>/configurator</code> addresses redirect to each card's{" "}
        <Link
          to="/power-flow-card-plus/playground"
          className="decoration-solar underline-offset-4 hover:underline"
        >
          playground
        </Link>
        .
      </p>
    </>
  );
}
