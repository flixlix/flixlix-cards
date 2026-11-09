import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { changesetProblems } from "./changeset-rules.js";

const directory = process.argv[2] ?? ".changeset";
const failures = readdirSync(directory)
  .filter((file) => file.endsWith(".md") && file !== "README.md")
  .flatMap((file) =>
    changesetProblems(readFileSync(join(directory, file), "utf8")).map(
      (problem) => `${join(directory, file)}: ${problem}`
    )
  );

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
