import { describe, expect, it } from "vite-plus/test";

import { searchDocs } from "./docs-search-index";

const paths = (query: string, max?: number) => searchDocs(query, max).map((entry) => entry.to);

describe("searchDocs", () => {
  it.each([
    ["power", "/power-flow-card-plus"],
    ["power flow", "/power-flow-card-plus"],
    ["energy flow", "/energy-flow-card-plus"],
    ["energy flow card plus", "/energy-flow-card-plus"],
    ["home flow card", "/home-flow-card"],
    ["period selector", "/energy-period-selector-plus"],
    ["sortable", "/sortable-list-card"],
    ["breakdown", "/energy-breakdown-card"],
  ])("ranks the card overview first for %j", (query, overview) => {
    expect(paths(query)[0]).toBe(overview);
  });

  it("ranks every card named by the query above anything inside a card", () => {
    expect(paths("energy", 3).toSorted()).toEqual([
      "/energy-breakdown-card",
      "/energy-flow-card-plus",
      "/energy-period-selector-plus",
    ]);
    expect(paths("flow card", 3).toSorted()).toEqual([
      "/energy-flow-card-plus",
      "/home-flow-card",
      "/power-flow-card-plus",
    ]);
  });

  it("ranks pages titled by the query above sections, options and examples", () => {
    const results = searchDocs("installation", 6);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.type === "page" && entry.title === "Installation")).toBe(
      true
    );
  });

  it("still ranks an exact option name above the card it belongs to", () => {
    expect(searchDocs("power_outage")[0]).toMatchObject({ title: "power_outage", type: "option" });
  });
});
