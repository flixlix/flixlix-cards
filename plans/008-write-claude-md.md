# Plan 008: Write a root CLAUDE.md so agents stop rediscovering the monorepo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `ls CLAUDE.md AGENTS.md 2>/dev/null` — if either
> file now exists, STOP (someone wrote one already; reconcile instead of
> overwriting).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

This repo is actively worked on by AI agents (these plans included), and every session re-derives the same facts: which packages exist, that `pnpm test` excludes the web app, that each card serves on a different dev port, how the dist-repo release dance works. A root `CLAUDE.md` makes every future agent session start warm. Everything below was verified during the audit at commit `ecfffc3` — the executor's job is assembly and double-checking, not research.

## Current state

No `CLAUDE.md` or `AGENTS.md` exists at the repo root. Verified facts to encode (re-verify each against the named source file while writing):

- **What this is**: pnpm 11 + Turborepo monorepo of Home Assistant custom cards (Lit 3) + a docs site. Node `>=22.18.0` (`.nvmrc`: `v22.18.0`).
- **Layout**: `packages/flixlix-cards/{power-flow-card-plus, energy-flow-card-plus, energy-breakdown-card, sortable-list-card}` (the published cards, rollup-bundled); `packages/shared` (calculations, i18n, ui-editor infra — bundled into cards, not published); `packages/ui` (React components for the docs site); `packages/utils/cn`; `packages/tooling/{bundler, eslint-config, prettier-config, testing, typescript-config}`; `apps/web` (docs site, TanStack Start + Vite + Tailwind 4, deployed to Vercel at cards.flixlix.com).
- **Commands** (root, all via turbo): `pnpm build`, `pnpm test` (**excludes** `@flixlix-cards/web` — see root `package.json` `"test"` script), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm precommit`. Web-app tests: `pnpm --filter @flixlix-cards/web test`.
- **Card dev loop**: `pnpm start:hass` (Docker HA on :8123, optional) + `pnpm dev` inside a card package; dev-server ports: power-flow-card-plus **5001** (bundler default, `packages/tooling/bundler/index.js:14`), energy-flow-card-plus **5003**, energy-breakdown-card **5004**, sortable-list-card **5005** (each card's `rollup.config.js`).
- **Releases**: Changesets. Card behavior changes need `pnpm changeset` (cards are the unscoped packages; `@flixlix-cards/*` scoped packages are internal and filtered out by `release.yml`). On main, `release.yml` versions/tags and pushes built bundles to per-card dist repos (`github.com/flixlix/<card-name>`) using a `DIST_REPO_TOKEN` secret.
- **Dependency management**: versions are centralized in `pnpm-workspace.yaml` **catalogs** (`catalog:` / `catalog:packages` protocol). pnpm settings (`publicHoistPattern`, `allowBuilds`, overrides) also live in `pnpm-workspace.yaml` — pnpm 11 ignores `.npmrc`/package.json settings; do not move them.
- **Conventions**: commit style gitmoji + conventional (`fix: :bug: …`, `feat: :sparkles: …` — see `git log --oneline -15`); branch names `fix/…`, `feat/…`, `docs/…`, `chore/…`; prettier + eslint enforced (`pnpm precommit`); tests are vitest in `__tests__/` directories.
- **Plans**: `plans/` holds advisor-generated implementation plans; read `plans/README.md` before starting improvement work.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Verify a claim | the command named in each bullet above | matches the stated fact |
| Sanity | `pnpm test` | all pass (unchanged) |

## Scope

**In scope** (the only files you should create/modify):
- `CLAUDE.md` (create, repo root)
- `plans/README.md` (status row)

**Out of scope**: everything else. This plan changes zero behavior.

## Git workflow

- Branch: `advisor/008-claude-md`
- Commit style: `docs: :memo: add CLAUDE.md`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify every fact

For each bullet in "Current state", open the named source (`package.json` scripts, `pnpm-workspace.yaml`, `rollup.config.js` files, `release.yml`, `git log`) and confirm it is still true. Correct anything that drifted.

**Verify**: each fact has a confirming file/line or command output.

### Step 2: Write `CLAUDE.md`

Sections, in order: **What this repo is** (2 sentences) → **Layout** → **Commands** (table) → **Card dev loop** (incl. the port table) → **Releases & changesets** → **Dependency management (catalogs!)** → **Conventions** → **Plans directory**. Keep it under ~120 lines; link to `CONTRIBUTING.md` and `https://cards.flixlix.com` rather than duplicating long-form docs. State imperatives plainly ("Run `pnpm changeset` for any card behavior change").

**Verify**: `wc -l CLAUDE.md` → ≤ ~130; every command in the file copy-paste runs successfully.

## Test plan

Not applicable (docs only). The verification is Step 1's fact-check and running each documented command once.

## Done criteria

- [ ] `CLAUDE.md` exists at root with all eight sections
- [ ] Every command in it was executed once and exited 0
- [ ] Port table matches the four `rollup.config.js` files + bundler default
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `CLAUDE.md` or `AGENTS.md` already exists (drift check).
- A "verified fact" turns out to be wrong in a way you cannot resolve by reading the named source — report the contradiction rather than guessing.

## Maintenance notes

- Update `CLAUDE.md` in the same PR as any change to: root scripts, workspace layout, dev ports, or the release pipeline. Reviewer: treat a stale CLAUDE.md as a bug.
- After Plan 007 lands, add a line: "New card editors extend `BaseCardEditor` from `@flixlix-cards/shared/ui-editor/base-editor`."
