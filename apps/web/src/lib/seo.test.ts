import { describe, expect, it } from "vite-plus/test";

import { INDEXABLE_PAGES, pageHead } from "./seo";

const metaContent = (path: string, key: string) =>
  pageHead(path).meta.find(
    (m) => ("name" in m && m.name === key) || ("property" in m && m.property === key)
  );

describe("pageHead", () => {
  it("gives each docs page its own title", () => {
    const titles = INDEXABLE_PAGES.map((page) => pageHead(page.to).meta.find((m) => "title" in m));

    expect(new Set(titles.map((t) => t && "title" in t && t.title)).size).toBe(
      INDEXABLE_PAGES.length
    );
  });

  it("names the card and the page in the title", () => {
    expect(pageHead("/power-flow-card-plus/configuration").meta).toContainEqual({
      title: "Configuration · Power Flow Card Plus | flixlix-cards",
    });
  });

  it("points the canonical URL at the production domain", () => {
    expect(pageHead("/home-flow-card/examples").links).toEqual([
      { rel: "canonical", href: "https://cards.flixlix.com/home-flow-card/examples" },
    ]);
  });

  it("keeps playgrounds out of the index", () => {
    expect(metaContent("/power-flow-card-plus/playground", "robots")).toEqual({
      name: "robots",
      content: "noindex, follow",
    });
    expect(INDEXABLE_PAGES.some((page) => page.to.endsWith("/playground"))).toBe(false);
  });

  it("finds index routes matched with a trailing slash", () => {
    expect(pageHead("/power-flow-card-plus/").meta).toContainEqual({
      title: "Power Flow Card Plus for Home Assistant | flixlix-cards",
    });
  });
});
