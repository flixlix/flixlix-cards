import { expect, it } from "vite-plus/test";
import { formatReleaseLine } from "./changelog.js";

const PULL = "[#450](https://github.com/flixlix/flixlix-cards/pull/450)";

it("labels the line with its category and links its pull request", () => {
  expect(
    formatReleaseLine({
      summary: "fix: the grid has a label again.\n",
      pull: PULL,
      author: { login: "flixlix", link: "[@flixlix](https://github.com/flixlix)" },
      maintainers: ["flixlix"],
    })
  ).toBe(`\n\n- **Fix:** The grid has a label again. (${PULL})`);
});

it("thanks contributors who are not maintainers", () => {
  expect(
    formatReleaseLine({
      summary: "feat: structured names.",
      pull: PULL,
      author: { login: "bramkragten", link: "[@bramkragten](https://github.com/bramkragten)" },
      maintainers: ["flixlix"],
    })
  ).toBe(
    `\n\n- **New:** Structured names. (${PULL}, thanks [@bramkragten](https://github.com/bramkragten))`
  );
});

it("leaves a summary without a type unlabelled and indents its other lines", () => {
  expect(formatReleaseLine({ summary: "Car.\n\nTwo lists." })).toBe("\n\n- Car.\n\n  Two lists.");
});
