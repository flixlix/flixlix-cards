# CLAUDE.md — flixlix-cards monorepo

This is a pnpm 11 + Turborepo monorepo of Home Assistant custom cards built with Lit 3, plus a docs site. Node `>=22.18.0` (`.nvmrc`: `v22.18.0`). Full user-facing docs live at <https://cards.flixlix.com>; contributor guidance is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

```
packages/
  flixlix-cards/
    power-flow-card-plus/     # published card (rollup-bundled)
    energy-flow-card-plus/    # published card
    energy-breakdown-card/    # published card
    sortable-list-card/       # published card
  shared/                     # calculations, i18n, ui-editor infra — bundled into cards, NOT published
  ui/                         # React components for the docs site
  utils/cn/                   # classname utility
  tooling/
    bundler/                  # shared rollup config (createCardConfig)
    eslint-config/
    prettier-config/
    testing/
    typescript-config/
apps/
  web/                        # docs site — TanStack Start + Vite + Tailwind 4, deployed to Vercel
```

`packages/flixlix-cards/*` are the four unscoped published packages. All `@flixlix-cards/*`-scoped packages are internal.

## Commands

Run all commands from the repo root unless noted. Everything routes through Turborepo.

| Task | Command |
|------|---------|
| Build all | `pnpm build` |
| Test (excludes web app) | `pnpm test` |
| Test web app only | `pnpm --filter @flixlix-cards/web test` |
| Type-check | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Format check | `pnpm format:check` |
| Pre-commit checks | `pnpm precommit` |
| Create a changeset | `pnpm changeset` |

> `pnpm test` runs `turbo test --filter=!@flixlix-cards/web`. The web app has its own test suite; run it separately when changing `apps/web`.

Tests use **Vitest** and live in `__tests__/` directories inside each package.

## Card dev loop

1. **Optional**: start a local Home Assistant instance:
   ```
   pnpm start:hass   # Docker HA on http://localhost:8123
   ```
2. Inside the card package, start the dev server:
   ```
   pnpm dev
   ```

Dev-server ports (each card's `rollup.config.js`, default in `packages/tooling/bundler/index.js`):

| Card | Port |
|------|------|
| power-flow-card-plus | **5001** (bundler default — no explicit port in rollup.config.js) |
| energy-flow-card-plus | **5003** |
| energy-breakdown-card | **5004** |
| sortable-list-card | **5005** |

## Releases & changesets

Cards use **Changesets**. Run `pnpm changeset` for any card behavior change (new feature, fix, or breaking change). Do **not** bump `@flixlix-cards/*`-scoped packages — they are internal and filtered out by `release.yml`.

On `main`, `release.yml`:
1. Versions packages and creates a release PR (via Changesets action).
2. Builds each changed card and pushes the built bundle to its dist repo at `github.com/flixlix/<card-name>` (e.g. `github.com/flixlix/power-flow-card-plus`).
3. Creates a GitHub Release on the dist repo.

The dist-repo push uses the `DIST_REPO_TOKEN` secret. Do not merge release PRs manually — let the workflow handle versioning.

## Dependency management (catalogs!)

All dependency versions are centralized in `pnpm-workspace.yaml` **catalogs**:

- `catalog:` — shared deps used across the whole workspace (React, TypeScript, Tailwind, etc.)
- `catalog:packages` — card/tooling package deps (Lit, Rollup plugins, Changesets, etc.)

Reference them as `"catalog:"` or `"catalog:packages"` in `package.json` `dependencies`/`devDependencies`. **Do not pin versions directly in `package.json`** — update `pnpm-workspace.yaml` instead.

pnpm settings (`publicHoistPattern`, `allowBuilds`, overrides) also live in `pnpm-workspace.yaml`. pnpm 11 ignores `.npmrc` and `package.json` pnpm settings — do not move them.

## Conventions

- **Commits**: gitmoji + conventional — `fix: :bug: …`, `feat: :sparkles: …`, `docs: :memo: …`, `chore: :bookmark: …`
- **Branches**: `fix/…`, `feat/…`, `docs/…`, `chore/…`
- **Formatting/linting**: enforced via `pnpm precommit` (Prettier + ESLint); run before committing
- **Card editors**: extend `BaseCardEditor` from `@flixlix-cards/shared` (see `packages/shared/`)

## Plans directory

`plans/` (on the `advisor/plans` branch) holds advisor-generated implementation plans. Read `plans/README.md` before starting improvement work to avoid duplicating or conflicting with planned changes.
