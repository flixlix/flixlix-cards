import { expect, it } from "vite-plus/test";
import { changesetProblems } from "./changeset-rules.js";

const frontmatter = '---\n"power-flow-card-plus": patch\n---\n\n';

it("accepts a typed one-sentence summary", () => {
  expect(changesetProblems(`${frontmatter}fix: the grid has a label again.\n`)).toEqual([]);
});

it("asks for a type", () => {
  expect(changesetProblems(`${frontmatter}The grid has a label again.\n`)).toEqual([
    'start the summary with its type, one of "breaking:", "feat:", "fix:", "perf:", "docs:", "chore:"',
  ]);
});

it("rejects a second paragraph and a long summary", () => {
  const long = `feat: ${"word ".repeat(70)}`;

  expect(changesetProblems(`${frontmatter}feat: a car.\n\nIt has two lists.\n`)).toEqual([
    "keep the summary to one paragraph; details belong in the README and docs",
  ]);
  expect(changesetProblems(`${frontmatter}${long}`)).toEqual([
    "the summary is 349 characters; keep it to 280 (one or two sentences)",
  ]);
});

it("rejects an empty summary", () => {
  expect(changesetProblems(frontmatter)).toEqual(["the summary is empty"]);
});
