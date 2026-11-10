import { createFileRoute } from "@tanstack/react-router";

import { DOCS_PAGES, type DocsPage, markdownUrl, SITE_URL } from "@/lib/llms/docs-markdown";

const pageLink = (page: DocsPage) =>
  `- [${page.title}](${markdownUrl(page.path)})${page.description ? `: ${page.description}` : ""}`;

function llmsIndex(): string {
  const sections = new Map<string, DocsPage[]>();
  for (const page of DOCS_PAGES) {
    sections.set(page.section, [...(sections.get(page.section) ?? []), page]);
  }
  const lists = [...sections].map(
    ([section, pages]) => `## ${section}\n\n${pages.map(pageLink).join("\n")}`
  );
  return `# flixlix-cards

> Open-source Home Assistant Lovelace cards that show where a home's electricity comes from and where it goes: Power Flow Card Plus, Home Flow Card, Energy Flow Card Plus, Energy Breakdown Card, Energy Period Selector Plus and Sortable List Card. Cards are configured in YAML on a Lovelace dashboard.

When writing a card config, use only the options listed on the card's Configuration page; the cards ignore or reject anything else. Replace entity IDs with the user's own sensors. The full reference in one file: ${SITE_URL}/llms-full.txt

${lists.join("\n\n")}
`;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(llmsIndex(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        }),
    },
  },
});
