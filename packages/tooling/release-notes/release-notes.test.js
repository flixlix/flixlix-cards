import { describe, expect, it } from "vite-plus/test";
import { releaseNotes } from "./release-notes.js";

const PULL = "[#450](https://github.com/flixlix/flixlix-cards/pull/450)";

function notes(changelog, version = "0.2.0") {
  return releaseNotes({
    changelog,
    version,
    repo: "flixlix/power-flow-card-plus",
    maintainers: ["flixlix"],
  });
}

describe("releaseNotes", () => {
  it("groups labelled entries by category, in category order, across bump headings", () => {
    const result = notes(`# card

## 0.2.0

### Minor Changes

- **New:** A car in front of the house (${PULL})

### Patch Changes

- **Fix:** The grid has a label again (${PULL})
- **Breaking:** \`old_option\` is gone (${PULL})

## 0.1.0

- **New:** First release
`);

    expect(result).toBe(`## ⚠️ Breaking changes

- \`old_option\` is gone (${PULL})

## ✨ New

- A car in front of the house (${PULL})

## 🐛 Fixes

- The grid has a label again (${PULL})

# Support Me ❤️

If you like the changes, love this card and want to support my work, feel free to give me a coffee ☕️
❤️ [My Ko-Fi](https://ko-fi.com/flixlix)
❤️ [My Github Sponsor Page](https://github.com/sponsors/flixlix)

**Full Changelog**: https://github.com/flixlix/power-flow-card-plus/compare/v0.1.0...v0.2.0
`);
  });

  it("compares a stable release with the previous stable one, skipping its betas", () => {
    const changelog = `## 0.4.0\n\n- **Fix:** a\n\n## 0.4.0-beta.1\n\n- **Fix:** b\n\n## 0.4.0-beta.0\n\n- **Fix:** c\n\n## 0.3.7\n\n- **Fix:** d\n`;

    expect(notes(changelog, "0.4.0")).toContain("/compare/v0.3.7...v0.4.0");
    expect(notes(changelog, "0.4.0-beta.1")).toContain("/compare/v0.4.0-beta.0...v0.4.0-beta.1");
  });

  it("only takes the entries of the requested version", () => {
    const result = notes(
      `## 0.3.0\n\n- **Fix:** later\n\n## 0.2.0\n\n- **Fix:** this one\n\n## 0.1.0\n\n- **Fix:** earlier\n`
    );

    expect(result).toContain("- this one");
    expect(result).not.toContain("later");
    expect(result).not.toContain("earlier");
  });

  it("strips the commit and maintainer thanks of entries @changesets/changelog-github wrote", () => {
    const result = notes(`## 0.2.0

### Patch Changes

- [#448](https://github.com/flixlix/flixlix-cards/pull/448) [\`3832579\`](https://github.com/flixlix/flixlix-cards/commit/3832579) Thanks [@flixlix](https://github.com/flixlix)! - The card no longer draws over overlays.

- [#348](https://github.com/flixlix/flixlix-cards/pull/348) [\`0eb74c9\`](https://github.com/flixlix/flixlix-cards/commit/0eb74c9) Thanks [@bramkragten](https://github.com/bramkragten)! - Fix: names follow the registry.

- Updated dependencies [[\`59ec2b7\`](https://github.com/flixlix/flixlix-cards/commit/59ec2b7)]:
  - @flixlix-cards/shared@0.1.0
`);

    expect(result).toContain(
      "## 🐛 Fixes\n\n- Names follow the registry. ([#348](https://github.com/flixlix/flixlix-cards/pull/348), thanks [@bramkragten](https://github.com/bramkragten))"
    );
    expect(result).toContain(
      "## 🔧 Other changes\n\n- The card no longer draws over overlays. ([#448](https://github.com/flixlix/flixlix-cards/pull/448))"
    );
    expect(result).not.toContain("Updated dependencies");
    expect(result).not.toContain("3832579");
  });

  it("keeps an entry's indented paragraphs with it", () => {
    const result = notes(
      `## 0.2.0\n\n- **New:** Car.\n\n  Two condition lists.\n\n- **New:** Bike.\n`
    );

    expect(result).toContain("- Car.\n\n  Two condition lists.\n- Bike.");
  });

  it("still links support when the version has no entries", () => {
    const result = notes("## 0.1.0\n\n- **New:** First\n", "0.2.0");

    expect(result.startsWith("Release v0.2.0\n\n# Support Me ❤️")).toBe(true);
    expect(result).not.toContain("Full Changelog");
  });
});
