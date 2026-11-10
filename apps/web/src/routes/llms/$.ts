import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";

import { findDocsPage, pageMarkdown } from "@/lib/llms/docs-markdown";

const docsPath = (splat: string) => {
  const path = `/${splat.replace(/\.md$/, "")}`;
  return path === "/index" ? "/" : path;
};

export const Route = createFileRoute("/llms/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const page = findDocsPage(docsPath(params._splat ?? ""));
        if (!page) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(await pageMarkdown(await getRouterInstance(), page), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
