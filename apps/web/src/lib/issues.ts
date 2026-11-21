export const ISSUE_TEMPLATES = {
  bug: "bug-report.yaml",
  feature: "feature-request.yaml",
} as const;

export type IssueKind = keyof typeof ISSUE_TEMPLATES;

/** The options of the "Which card is this for?" dropdown in both issue templates. */
export const ISSUE_CARDS = [
  "Power Flow Card Plus",
  "Home Flow Card",
  "Energy Flow Card Plus",
  "Energy Breakdown Card",
  "Energy Period Selector Plus",
  "Sortable List Card",
] as const;

export type IssueCard = (typeof ISSUE_CARDS)[number];

export function newIssueUrl(kind: IssueKind, card: IssueCard): string {
  const params = new URLSearchParams({ template: ISSUE_TEMPLATES[kind], package: card });
  return `https://github.com/flixlix/flixlix-cards/issues/new?${params.toString()}`;
}
