// Ordered as they appear in the release notes.
export const CATEGORIES = [
  { type: "breaking", label: "Breaking", heading: "⚠️ Breaking changes" },
  { type: "feat", label: "New", heading: "✨ New" },
  { type: "fix", label: "Fix", heading: "🐛 Fixes" },
  { type: "perf", label: "Performance", heading: "⚡ Performance" },
  { type: "docs", label: "Docs", heading: "📖 Docs" },
  { type: "chore", label: "Maintenance", heading: "🧰 Maintenance" },
  { type: "other", label: "Other", heading: "🔧 Other changes" },
];

export const CHANGESET_TYPES = CATEGORIES.map(({ type }) => type).filter(
  (type) => type !== "other"
);

const TYPE_PREFIX = new RegExp(`^(${CHANGESET_TYPES.join("|")}):\\s*`);

export function categoryOfType(type) {
  return CATEGORIES.find((category) => category.type === type) ?? categoryOfType("other");
}

export function categoryOfLabel(label) {
  return CATEGORIES.find((category) => category.label === label);
}

/** Splits `fix: The grid …` into its type and the sentence a user reads. */
export function parseSummary(summary) {
  const trimmed = summary.trim();
  const match = TYPE_PREFIX.exec(trimmed);
  if (!match) {
    return { type: undefined, text: trimmed };
  }
  return { type: match[1], text: capitalize(trimmed.slice(match[0].length)) };
}

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
