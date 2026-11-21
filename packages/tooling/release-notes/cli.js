import { readFileSync } from "node:fs";
import { releaseNotes } from "./release-notes.js";

const [changelogPath, version, repo] = process.argv.slice(2);
if (!changelogPath || !version || !repo) {
  console.error("Usage: node cli.js <CHANGELOG.md> <version> <owner/dist-repo>");
  process.exit(1);
}

process.stdout.write(
  releaseNotes({
    changelog: readFileSync(changelogPath, "utf8"),
    version,
    repo,
    maintainers: ["flixlix"],
  })
);
