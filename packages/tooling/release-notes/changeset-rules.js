import { CHANGESET_TYPES, parseSummary } from "./categories.js";

export const MAX_SUMMARY_LENGTH = 280;

/** What keeps a changeset from becoming one short, categorized line of the release notes. */
export function changesetProblems(changeset) {
  const summary = changeset.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  if (summary === "") {
    return ["the summary is empty"];
  }
  const problems = [];
  const { type, text } = parseSummary(summary);
  if (!type) {
    problems.push(
      `start the summary with its type, one of ${CHANGESET_TYPES.map((t) => `"${t}:"`).join(", ")}`
    );
  }
  if (/\n\s*\n/.test(text)) {
    problems.push("keep the summary to one paragraph; details belong in the README and docs");
  }
  if (text.length > MAX_SUMMARY_LENGTH) {
    problems.push(
      `the summary is ${text.length} characters; keep it to ${MAX_SUMMARY_LENGTH} (one or two sentences)`
    );
  }
  return problems;
}
