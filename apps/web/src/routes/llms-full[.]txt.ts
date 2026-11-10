import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";

import { DOCS_PAGES, pageMarkdown } from "@/lib/llms/docs-markdown";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const pages = await Promise.all(DOCS_PAGES.map((page) => pageMarkdown(router, page)));
        return new Response(pages.join("\n---\n\n"), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
