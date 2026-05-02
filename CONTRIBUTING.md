# Contributing

Thanks for your interest in contributing to the `flixlix-cards` monorepo! This repository contains multiple Home Assistant cards.

> [!TIP]
> The same guide with nicer formatting (and screenshots) lives at **[cards.flixlix.com/contributing](https://cards.flixlix.com/contributing)**.

## Requirements

- **Node.js** (LTS recommended): [Download](https://nodejs.org/en/download)
- **pnpm**: [Install Instructions](https://pnpm.io/installation)
- **Docker** (only required for local Home Assistant development via `pnpm start:hass`): [Get Started](https://www.docker.com/get-started/)

## Monorepo Structure

Each card is located in its own folder inside [`packages/flixlix-cards`](packages/flixlix-cards/):

- `power-flow-card-plus`
- `energy-flow-card-plus`
- _(more to come!)_

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

3. **(Optional) Start Home Assistant locally** for testing (from the repo root):

   ```bash
   pnpm start:hass
   ```

   You only need Docker for this step. Alternatively, use your own Home Assistant instance instead.

4. **Build and serve the card you’re working on:**  
   Most cards support a `watch` script for live rebuilding. Run it from the card's package folder:

   ```bash
   pnpm dev
   ```

5. **Add the built card to Home Assistant’s dashboard resources:**  
   (Change the filename to match the card you’re developing.)

   ```text
   http://<your-ip>:5001/<card-filename>.js
   ```

   Example for Power Flow Card Plus:

   ```text
   http://<your-ip>:5001/power-flow-card-plus.js
   ```

6. **Open Home Assistant:**

   ```text
   http://localhost:8123
   ```

   Complete onboarding if needed, add the card to a dashboard, and test your changes.

7. **Make your code changes.** Commit them following the repository’s style and conventions.

## Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage version bumps and release notes across all packages.

- **If your changes affect a released card**, run:

  ```bash
  pnpm changeset
  ```

  Follow the prompts to create a changeset. Write a clear summary of what changed in the generated markdown file.

- **Release notes and versioning** will be handled automatically during the release process.

## Questions & Help

If you have questions, get stuck, or need clarification:
- Check the card’s own README for usage details or quirks.
- Feel free to create an issue on GitHub describing your problem or question.
