import { CATEGORIES, capitalize, categoryOfLabel, categoryOfType } from "./categories.js";

const LABELLED = /^\*\*([^*]+):\*\* /;
// The line @changesets/changelog-github wrote before this package replaced it.
const GITHUB_CHANGELOG_PREFIX =
  /^(?:\[(#\d+)\]\(([^)]+)\) )?(?:\[`[0-9a-f]+`\]\([^)]+\) )?(?:Thanks \[@([^\]]+)\]\(([^)]+)\)! )?- /;

/**
 * The body of a GitHub release: this version's CHANGELOG entries grouped by category,
 * then the support links and a link comparing it with the previous release.
 */
export function releaseNotes({ changelog, version, repo, maintainers = [] }) {
  const sections = changelogSections(changelog);
  const index = sections.findIndex((section) => section.version === version);
  const entries = index === -1 ? [] : sectionEntries(sections[index].lines, maintainers);
  const previous = index === -1 ? undefined : previousVersion(sections.slice(index + 1), version);

  const groups = CATEGORIES.map((category) => ({
    heading: category.heading,
    entries: entries.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);

  const body =
    groups.length > 0
      ? groups
          .map(
            (group) =>
              `## ${group.heading}\n\n${group.entries.map((entry) => entry.text).join("\n")}`
          )
          .join("\n\n")
      : `Release v${version}`;

  return `${body}\n\n${footer({ repo, version, previous })}\n`;
}

function footer({ repo, version, previous }) {
  const lines = [
    "# Support Me ❤️",
    "",
    "If you like the changes, love this card and want to support my work, feel free to give me a coffee ☕️",
    "❤️ [My Ko-Fi](https://ko-fi.com/flixlix)",
    "❤️ [My Github Sponsor Page](https://github.com/sponsors/flixlix)",
  ];
  if (previous) {
    lines.push(
      "",
      `**Full Changelog**: https://github.com/${repo}/compare/v${previous}...v${version}`
    );
  }
  return lines.join("\n");
}

function changelogSections(changelog) {
  const sections = [];
  for (const line of changelog.split("\n")) {
    const heading = /^## (\S+)\s*$/.exec(line);
    if (heading) {
      sections.push({ version: heading[1], lines: [] });
    } else {
      sections.at(-1)?.lines.push(line);
    }
  }
  return sections;
}

function isPrerelease(version) {
  return version.includes("-");
}

// A stable release is compared with the last stable one, so its link spans its betas too.
function previousVersion(olderSections, version) {
  const candidates = isPrerelease(version)
    ? olderSections
    : olderSections.filter((section) => !isPrerelease(section.version));
  return candidates[0]?.version;
}

function sectionEntries(lines, maintainers) {
  const entries = [];
  let bump;
  let current;
  for (const line of lines) {
    const bumpHeading = /^### (Major|Minor|Patch) Changes/.exec(line);
    if (bumpHeading) {
      bump = bumpHeading[1].toLowerCase();
      current = undefined;
    } else if (line.startsWith("- ")) {
      current = { bump, lines: [line.slice(2)] };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return entries
    .map((entry) => toReleaseEntry(entry, maintainers))
    .filter((entry) => entry !== undefined);
}

function toReleaseEntry({ bump, lines }, maintainers) {
  const [first, ...rest] = trimTrailingBlankLines(lines);
  if (first.startsWith("Updated dependencies")) {
    return undefined;
  }
  const { category, firstLine } = categorize(first, bump, maintainers);
  const continuation = rest.length > 0 ? `\n${rest.join("\n")}` : "";
  return { category, text: `- ${firstLine}${continuation}` };
}

function categorize(first, bump, maintainers) {
  const labelled = LABELLED.exec(first);
  const labelledCategory = labelled && categoryOfLabel(labelled[1]);
  if (labelledCategory) {
    return { category: labelledCategory, firstLine: first.slice(labelled[0].length) };
  }

  const legacy = GITHUB_CHANGELOG_PREFIX.exec(first);
  let text = first;
  if (legacy?.[0] && legacy[0] !== "- ") {
    const [prefix, pullLabel, pullUrl, author, authorUrl] = legacy;
    const credits = [
      pullLabel ? `[${pullLabel}](${pullUrl})` : undefined,
      author && !maintainers.includes(author) ? `thanks [@${author}](${authorUrl})` : undefined,
    ].filter(Boolean);
    text = `${first.slice(prefix.length)}${credits.length > 0 ? ` (${credits.join(", ")})` : ""}`;
  }

  const fix = /^Fix:\s*/i.exec(text);
  if (fix) {
    return { category: categoryOfType("fix"), firstLine: capitalize(text.slice(fix[0].length)) };
  }
  return { category: categoryOfType(bump === "patch" ? "other" : "feat"), firstLine: text };
}

function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 1 && trimmed.at(-1)?.trim() === "") {
    trimmed.pop();
  }
  return trimmed;
}
