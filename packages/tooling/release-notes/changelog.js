import { getInfo } from "@changesets/get-github-info";
import { categoryOfType, parseSummary } from "./categories.js";

/**
 * One CHANGELOG line per changeset: `- **Fix:** The grid … ([#450](…))`.
 * The bold label is what `releaseNotes` groups by, so keep the two in sync.
 */
export function formatReleaseLine({ summary, pull, author, maintainers = [] }) {
  const { type, text } = parseSummary(summary);
  const [firstLine, ...rest] = text.split("\n");
  const credits = [
    pull,
    author && !maintainers.includes(author.login) ? `thanks ${author.link}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  const label = type ? `**${categoryOfType(type).label}:** ` : "";
  const continuation = rest.map((line) => (line ? `  ${line}` : line)).join("\n");
  return `\n\n- ${label}${firstLine}${credits ? ` (${credits})` : ""}${continuation ? `\n${continuation}` : ""}`;
}

async function getReleaseLine(changeset, _type, options) {
  if (!options?.repo) {
    throw new Error(
      'Set the repo for the release-notes changelog in .changeset/config.json: ["…/changelog.js", { "repo": "owner/name" }]'
    );
  }
  let pull;
  let author;
  if (changeset.commit) {
    const info = await getInfo({ repo: options.repo, commit: changeset.commit });
    pull = info.links.pull ?? undefined;
    author = info.user ? { login: info.user, link: info.links.user } : undefined;
  }
  return formatReleaseLine({
    summary: changeset.summary,
    pull,
    author,
    maintainers: options.maintainers,
  });
}

// The shared packages are bundled into each card, so their bumps mean nothing to a card's user.
async function getDependencyReleaseLine() {
  return "";
}

export default { getReleaseLine, getDependencyReleaseLine };
