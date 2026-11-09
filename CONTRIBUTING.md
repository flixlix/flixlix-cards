# Contributing

Thanks for your interest in contributing to the `flixlix-cards` monorepo! This repository contains multiple Home Assistant cards.

> [!TIP]
> The same guide with nicer formatting (and screenshots) lives at **[cards.flixlix.com/contributing](https://cards.flixlix.com/contributing)**.

## Requirements

- **Node.js** (LTS recommended): [Download](https://nodejs.org/en/download)
- **pnpm**: [Install Instructions](https://pnpm.io/installation)
- **Docker** (for the local Home Assistant via `pnpm hass:up` and for the visual tests via `pnpm test:visual`): [Get Started](https://www.docker.com/get-started/)

## Monorepo Structure

Each card is located in its own folder inside [`packages/flixlix-cards`](packages/flixlix-cards/):

- `power-flow-card-plus`
- `home-flow-card`
- `energy-flow-card-plus`
- `energy-breakdown-card`
- `sortable-list-card`
- `energy-period-selector-plus`

Shared logic, components and types live in [`packages/shared`](packages/shared/).

Each package contains its source code, changelogs, and relevant scripts.

## Local Development

1. **Install all dependencies** at the root of the monorepo:

   ```bash
   pnpm install
   ```

2. **Select a card to work on.** Change to the desired package directory, e.g.:

   ```bash
   cd packages/flixlix-cards/power-flow-card-plus
   ```

3. **(Optional) Start Home Assistant locally** (from the repo root, needs Docker):

   ```bash
   pnpm hass:up
   ```

   This builds the cards, starts Home Assistant at <http://localhost:8123> (user `dev`, password `dev`) with dummy entities and one dashboard per card already loading the built cards. See [`e2e/README.md`](e2e/README.md). Alternatively, use your own Home Assistant instance.

4. **Rebuild on change:** run `pnpm dev` in the card's package folder and reload the browser. With your own instance, add `http://<your-ip>:5001/<card-filename>.js` as a dashboard resource instead.

5. **Run the end-to-end tests** against that instance with `pnpm e2e`.

6. **Stop it** with `pnpm hass:down` (`pnpm hass:reset` wipes its state).

7. **Make your code changes.** Follow [`CODING_STANDARDS.md`](CODING_STANDARDS.md), then run the checks below before committing.

## Checks

The repo uses [Vite+](https://viteplus.dev) (`vp`): Oxfmt for formatting, Oxlint (type-aware) for linting and Vitest for tests. Configuration lives in the root [`vite.config.ts`](vite.config.ts); repo-specific lint rules live in [`packages/tooling/lint-rules`](packages/tooling/lint-rules/).

```bash
pnpm check      # format check + lint + type-aware checks
pnpm format     # apply formatting
pnpm typecheck  # tsc per package
pnpm test       # Vitest per package: node tests, then browser tests in Chromium
```

CI runs the same commands; a pull request must pass all of them with zero lint errors.

### Browser and visual tests

Each card has `<card>.browser.test.ts` files next to its source that mount the card in a real Chromium (Vitest browser mode with Playwright) against a fake Home Assistant: `fakeHass`, `mountCard` and the shared `flowScenarios` table live in [`packages/shared/src/testing`](packages/shared/src/testing/). Install Chromium once:

```bash
pnpm --filter power-flow-card-plus exec playwright install chromium
```

`<card>.visual.browser.test.ts` files compare screenshots. Fonts render differently per OS, so they run only inside the pinned Playwright Docker image:

```bash
pnpm test:visual         # compare against the committed baselines
pnpm test:visual:update  # rewrite the baselines after an intended visual change
```

Failed comparisons leave the actual and diff images in `packages/flixlix-cards/<card>/.vitest/attachments/`. When bumping `playwright` in `pnpm-workspace.yaml`, bump the image tag in `.github/workflows/test.yaml` and regenerate the baselines.

## Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage version bumps and release notes across all packages.

- **If your changes affect a released card**, run:

  ```bash
  pnpm changeset
  ```

  Follow the prompts to create a changeset, then write its summary for someone using the card: one paragraph of at most 280 characters, starting with its type. The type picks the section of the release notes:

  | Type        | Section             |
  | ----------- | ------------------- |
  | `breaking:` | ⚠️ Breaking changes |
  | `feat:`     | ✨ New              |
  | `fix:`      | 🐛 Fixes            |
  | `perf:`     | ⚡ Performance      |
  | `docs:`     | 📖 Docs             |
  | `chore:`    | 🧰 Maintenance      |

  ```md
  ---
  "home-flow-card": patch
  ---

  feat: the battery's label can show its state of charge before, after or above its power with `battery.state_of_charge_position`.
  ```

  Say what changed for the user; leave the how, examples and tables to the README and docs. `pnpm check` and the pre-commit hook reject a changeset without a type, with more than one paragraph or over 280 characters. `pnpm install` sets up the hook; if your global git config sets `core.hooksPath`, point this repository at it once with `git config core.hooksPath .vite-hooks/_ && pnpm exec vp hooks enable`.

- **Release notes and versioning** are handled automatically. Each card's GitHub release groups its changesets by type and ends with the support links and a link to the full changelog (`packages/tooling/release-notes`).

## Questions & Help

If you have questions, get stuck, or need clarification:

- Check the card’s own README for usage details or quirks.
- Feel free to create an issue on GitHub describing your problem or question.

## License

This project is released under the [MIT License](LICENSE).
