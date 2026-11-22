import { createFileRoute } from "@tanstack/react-router";

import { INDEXABLE_PAGES } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

function sitemap(): string {
  const urls = INDEXABLE_PAGES.map(
    (page) => `  <url><loc>${SITE_URL}${page.to === "/" ? "" : page.to}</loc></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemap(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        }),
    },
  },
});
