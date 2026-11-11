import { RouterContextProvider, type RegisteredRouter } from "@tanstack/react-router";
import { prerender } from "react-dom/static";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

import { INDEXABLE_PAGES } from "@/lib/seo";
import { markdownUrl, SITE_URL } from "@/lib/site";

export { markdownUrl, SITE_URL };

export type DocsPage = { path: string; title: string; description?: string; section: string };

export const DOCS_PAGES: DocsPage[] = INDEXABLE_PAGES.map((entry) => ({
  path: entry.to,
  title: entry.title,
  description: entry.description,
  section: entry.breadcrumb,
}));

export function findDocsPage(path: string): DocsPage | undefined {
  return DOCS_PAGES.find((page) => page.path === path);
}

async function renderPageHtml(router: RegisteredRouter, path: string): Promise<string> {
  const leaf = router.matchRoutes(path).at(-1);
  const Page = leaf ? router.routesById[leaf.routeId].options.component : undefined;
  if (!Page) {
    throw new Error(`No docs page component is routed at ${path}`);
  }
  const { prelude } = await prerender(
    <RouterContextProvider router={router}>
      <Page />
    </RouterContextProvider>
  );
  return new Response(prelude).text();
}

const indent = (text: string) => text.replace(/\n/g, "\n  ");

function createConverter(pagePath: string): TurndownService {
  const converter = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  converter.use(gfm);
  converter.remove(["button", "nav", "fieldset", "script", "style", "img"]);

  converter.addRule("option", {
    filter: (node) => node.hasAttribute("data-option"),
    replacement: (_content, element) => {
      const facts = [element.getAttribute("data-option-type")];
      const fallback = element.getAttribute("data-option-default");
      if (fallback) {
        facts.push(`default \`${fallback}\``);
      }
      if (element.hasAttribute("data-option-required")) {
        facts.push("required");
      }
      const descriptionHtml = element.querySelector("[data-option-description]")?.innerHTML ?? "";
      const description = converter.turndown(descriptionHtml);
      return `\n- \`${element.getAttribute("data-option")}\` (${facts.join(", ")}): ${indent(description)}\n`;
    },
  });

  converter.addRule("siteLink", {
    filter: (node) => node.nodeName === "A" && /^[/#]/.test(node.getAttribute("href") ?? ""),
    replacement: (content, node) => {
      const href = node.getAttribute("href") ?? "";
      if (href.startsWith("#") && /^H[1-6]$/.test(node.parentNode?.nodeName ?? "")) {
        return content;
      }
      return `[${content}](${SITE_URL}${href.startsWith("#") ? pagePath : ""}${href})`;
    },
  });

  // Rules added later take precedence, and addRule outranks remove(), so this goes last.
  converter.addRule("skip", {
    filter: (node) =>
      node.nodeName.toLowerCase() === "svg" ||
      node.hasAttribute("data-llms-skip") ||
      node.getAttribute("aria-hidden") === "true",
    replacement: () => "",
  });

  return converter;
}

export async function pageMarkdown(router: RegisteredRouter, page: DocsPage): Promise<string> {
  const body = createConverter(page.path).turndown(await renderPageHtml(router, page.path));
  return `Source: ${SITE_URL}${page.path}\n\n${body}\n`;
}
