import { describe, expect, it } from "vite-plus/test";

import { createMemoryHistory } from "@tanstack/react-router";

import { getRouter } from "@/router";

import { findDocsPage, pageMarkdown } from "./docs-markdown";

const markdownOf = async (path: string) => {
  const page = findDocsPage(path);
  if (!page) {
    throw new Error(`${path} is not in DOCS_PAGES`);
  }
  const router = getRouter();
  // Outside a request, TanStack Start has not given the router a history to build hrefs from.
  router.update({ ...router.options, history: createMemoryHistory() });
  return pageMarkdown(router, page);
};

describe("docs as markdown", () => {
  it("lists the options folded under 'advanced options' on the website", async () => {
    const markdown = await markdownOf("/power-flow-card-plus/configuration");

    expect(markdown).toContain("- `min_flow_rate` (number, default `0.75`): ");
  });

  it("keeps YAML examples as yaml code blocks", async () => {
    const markdown = await markdownOf("/home-flow-card/configuration");

    expect(markdown).toContain("```yaml\ntype: custom:home-flow-card\n");
  });

  it("links in-page anchors to the page on the docs site", async () => {
    const markdown = await markdownOf("/home-flow-card/configuration");

    expect(markdown).toContain(
      "(https://cards.flixlix.com/home-flow-card/configuration#generator)"
    );
  });
});
