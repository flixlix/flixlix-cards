# Plan 009: Monorepo hygiene batch — stale config, dead dep, drifted pins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- pnpm-workspace.yaml packages/shared/package.json packages/flixlix-cards/*/package.json packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts apps/web/package.json`
> On any mismatch with the excerpts below, treat that item (only) as a STOP
> condition and do the rest.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (touches `pnpm-workspace.yaml` and `packages/shared/package.json` — coordinate with Plans 003/006 if run concurrently; sequential is simplest)
- **Category**: tech-debt
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

Five small, verified inconsistencies that each cost confusion disproportionate to their fix: sub-packages pin an older pnpm than the root (tooling behaves differently depending on cwd), a workspace glob points at a directory that doesn't exist, the energy card re-declares a constant that `packages/shared` already exports (and the power card already imports), `packages/shared` depends on the npm package `sortable` — an unrelated library, never imported, almost certainly installed by accident alongside `sortablejs` — and the web app pins vitest two majors behind the catalog.

## Current state

1. **packageManager drift** — root `package.json:30` pins `pnpm@11.5.0+sha512…`; these five manifests pin `"packageManager": "pnpm@10.33.0"`:
   - `packages/flixlix-cards/power-flow-card-plus/package.json:90`
   - `packages/flixlix-cards/energy-flow-card-plus/package.json:90`
   - `packages/flixlix-cards/energy-breakdown-card/package.json:87`
   - `packages/flixlix-cards/sortable-list-card/package.json:87`
   - `packages/shared/package.json:44`
2. **Stale workspace glob** — `pnpm-workspace.yaml:6`: `- "packages/flixlix-cards/shared/*"` — that directory does not exist (`ls packages/flixlix-cards/shared` → no such file; the shared package lives at `packages/shared`, matched by the `packages/*` glob).
3. **Duplicated constant** — `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:85`: `const CIRCLE_CIRCUMFERENCE = 238.76104;` (used at lines 608, 1028-1037). `packages/shared/src/const/circle.ts:1` exports the identical value, and the power-flow card already imports it from `@flixlix-cards/shared/const/circle` — that import is the convention to match.
4. **Dead dependency** — `packages/shared/package.json` `dependencies` contains both `"sortablejs": "^1.15.7"` (real; imported in `packages/shared/src/ui-editor/utils/sortable.ts:1` and `components/individual-row-editor.ts:20`) and `"sortable": "^2.0.0"` (an unrelated package; `grep -rn 'from "sortable"' packages apps --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v sortablejs` → zero matches).
5. **vitest drift** — `apps/web/package.json` devDependencies: `"vitest": "^3.2.4"`, while `pnpm-workspace.yaml` `catalogs.packages` pins `vitest: 4.1.5` (all other packages use `catalog:packages`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| All gates | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |
| Web tests | `pnpm --filter @flixlix-cards/web test` | all pass |

## Scope

**In scope** (the only files you should modify):
- The five `package.json` files in item 1 (delete one line each)
- `pnpm-workspace.yaml` (delete line 6 ONLY)
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` (constant → import)
- `packages/shared/package.json` (delete the `"sortable"` line)
- `apps/web/package.json` (vitest pin — Step 5, optional)
- `pnpm-lock.yaml` (via `pnpm install`)
- `.changeset/<generated>.md` (create — energy-flow only, see Step 3)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `publicHoistPattern`, `allowBuilds`, catalogs, or any other `pnpm-workspace.yaml` content — those are intentional pnpm-11 configuration.
- `@tanstack/*: latest` and `nitro: 3.0.260311-beta` pins in `apps/web` — known debt, but re-pinning them is a docs-site stability decision for the maintainer, not a hygiene fix. Leave them.
- `sortablejs` (the real dependency).

## Git workflow

- Branch: `advisor/009-monorepo-hygiene`
- Commit per item is fine: `chore: :wrench: <item>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the five `packageManager` lines

Sub-packages inherit the root's `packageManager` in a pnpm workspace; the stale pins override it when commands run from a package directory.

**Verify**: `grep -rn "packageManager" packages apps --include="package.json" | grep -v node_modules` → no matches (root `package.json` keeps its line).

### Step 2: Delete the stale glob

Remove line 6 (`- "packages/flixlix-cards/shared/*"`) from `pnpm-workspace.yaml`. Run `pnpm install`.

**Verify**: `pnpm install` exit 0; `pnpm -r ls --depth -1 2>/dev/null | head -30` still lists `@flixlix-cards/shared`.

### Step 3: Import the circle constant

In `energy-flow-card-plus.ts`, delete line 85 and add `import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";` with the other `@flixlix-cards/shared` imports. Run `pnpm changeset`: **energy-flow-card-plus**, patch, "Internal: use shared circle constant" (it changes the published bundle, trivially).

**Verify**: `pnpm --filter energy-flow-card-plus test` → pass; `grep -n "238.76104" packages/flixlix-cards/` → only `packages/shared/src/const/circle.ts`.

### Step 4: Drop the dead `sortable` dep

Delete `"sortable": "^2.0.0"` from `packages/shared/package.json`. Run `pnpm install`.

**Verify**: the grep from "Current state" item 4 still returns zero matches; `pnpm test` → pass.

### Step 5 (optional, own commit): Align web vitest to the catalog

Change `apps/web/package.json` `"vitest": "^3.2.4"` → `"vitest": "catalog:packages"`. Run `pnpm install` then `pnpm --filter @flixlix-cards/web test`. If anything fails (vitest 3→4 has breaking changes), **revert this step entirely** and note it in the report — do not chase vitest-4 migration issues inside a hygiene plan.

**Verify**: web tests pass, or the step is cleanly reverted with a note.

### Step 6: Full gates

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → all exit 0.

## Test plan

No new tests; this plan removes dead weight. Gates: full root verification suite plus the web-app test run in Step 5.

## Done criteria

- [ ] No `packageManager` field outside root `package.json`
- [ ] `pnpm-workspace.yaml` has no `packages/flixlix-cards/shared/*` glob
- [ ] `238.76104` appears only in `packages/shared/src/const/circle.ts`
- [ ] `"sortable":` absent from `packages/shared/package.json`
- [ ] Step 5 either landed with passing web tests or was reverted with a note
- [ ] All root gates exit 0; changeset exists for energy-flow-card-plus
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `pnpm install` fails after any single step — revert that step and report (each step is independent; don't let one block the rest).
- The `sortable` grep finds a match (something started importing it since planning).
- Plans 003 or 006 are IN PROGRESS on the same files (`pnpm-workspace.yaml`, `packages/shared/package.json`) — coordinate ordering via `plans/README.md` first.

## Maintenance notes

- Catalogs are the single source of version truth — new deps should use `catalog:`/`catalog:packages`; reviewer should reject raw semver ranges in package manifests unless justified (the `apps/web` `latest` pins are pre-existing, tracked as deferred debt here and in Plan 006).
- Deferred explicitly: `@tanstack/*: latest` + `nitro` beta re-pinning (docs-site stability decision); `custom-card-helpers` replacement (abandoned upstream, ~6 import sites — mostly types + `fireEvent`/`debounce`; M-effort migration worth its own plan when HA types are sourced elsewhere).
