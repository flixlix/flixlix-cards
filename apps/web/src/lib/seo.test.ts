import { describe, expect, it } from "vite-plus/test";

import { NOT_FOUND_META, PAGE_META_PATHS, pageMeta } from "./page-meta";
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

  it("names the card and Home Assistant in the title", () => {
    expect(pageHead("/power-flow-card-plus/configuration").meta).toContainEqual({
      title: "Configure Power Flow Card Plus for Home Assistant | flixlix-cards",
    });
  });

  it("gives every indexable page a unique description in the snippet range", () => {
    const descriptions = INDEXABLE_PAGES.map((page) => pageMeta(page.to).description);
    const titles = INDEXABLE_PAGES.map((page) => pageMeta(page.to).title);
    const headings = INDEXABLE_PAGES.map((page) => pageMeta(page.to).h1);

    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(headings).size).toBe(headings.length);
    expect(PAGE_META_PATHS).toEqual(expect.arrayContaining(INDEXABLE_PAGES.map((page) => page.to)));
    for (const description of descriptions) {
      expect(description.length).toBeGreaterThanOrEqual(140);
      expect(description.length).toBeLessThanOrEqual(160);
    }
    expect(NOT_FOUND_META.description.length).toBeGreaterThanOrEqual(140);
    expect(NOT_FOUND_META.description.length).toBeLessThanOrEqual(160);
  });

  it("fills in the Twitter title and description", () => {
    expect(metaContent("/home-flow-card", "twitter:title")).toEqual({
      name: "twitter:title",
      content: "Home Flow Card: isometric house for Home Assistant | flixlix-cards",
    });
    expect(metaContent("/home-flow-card", "twitter:description")).toMatchObject({
      name: "twitter:description",
    });
  });

  it("points the canonical URL at the production domain", () => {
    expect(pageHead("/home-flow-card/examples").links).toContainEqual({
      rel: "canonical",
      href: "https://cards.flixlix.com/home-flow-card/examples",
    });
  });

  it("links each page to its markdown version for AI assistants", () => {
    expect(pageHead("/").links).toContainEqual({
      rel: "alternate",
      type: "text/markdown",
      href: "https://cards.flixlix.com/llms/index.md",
    });
    expect(pageHead("/energy-breakdown-card/configuration").links).toContainEqual({
      rel: "alternate",
      type: "text/markdown",
      href: "https://cards.flixlix.com/llms/energy-breakdown-card/configuration.md",
    });
  });

  it("shares a card's pages with that card's image", () => {
    expect(metaContent("/home-flow-card/configuration", "og:image")).toEqual({
      property: "og:image",
      content: "https://cards.flixlix.com/og/house.png",
    });
    expect(metaContent("/contributing", "og:image")).toEqual({
      property: "og:image",
      content: "https://cards.flixlix.com/og/general.png",
    });
    expect(metaContent("/", "twitter:card")).toEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
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
