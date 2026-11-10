import { readFileSync } from "node:fs";

import { parse } from "yaml";
import { describe, expect, it } from "vite-plus/test";

import { ISSUE_CARDS, ISSUE_TEMPLATES, newIssueUrl } from "./issues";

type IssueForm = {
  body: { type: string; id?: string; attributes: { options?: unknown[] } }[];
};

const issueForm = (template: string): IssueForm =>
  parse(
    readFileSync(new URL(`../../../../.github/ISSUE_TEMPLATE/${template}`, import.meta.url), "utf8")
  ) as IssueForm;

describe("newIssueUrl", () => {
  it.each(Object.entries(ISSUE_TEMPLATES))(
    "prefills a card the %s template offers in its dropdown",
    (_kind, template) => {
      const packageField = issueForm(template).body.find((field) => field.id === "package");

      expect(packageField?.type).toBe("dropdown");
      expect(packageField?.attributes.options).toEqual([...ISSUE_CARDS]);
    }
  );

  it("opens the chosen template with the card selected", () => {
    const url = new URL(newIssueUrl("feature", "Energy Breakdown Card"));

    expect(url.pathname).toBe("/flixlix/flixlix-cards/issues/new");
    expect(url.searchParams.get("template")).toBe("feature-request.yaml");
    expect(url.searchParams.get("package")).toBe("Energy Breakdown Card");
  });
});
