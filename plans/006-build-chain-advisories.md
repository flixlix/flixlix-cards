# Plan 006: Clear the high-severity advisories from the card build chain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/tooling/bundler/ pnpm-workspace.yaml pnpm-lock.yaml`
> Also re-run `pnpm audit --prod` first — if the advisory set differs from
> "Current state" below, adjust targets accordingly and note the difference.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (Plan 002 recommended first so CI verifies the result)
- **Category**: security
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

`pnpm audit --prod` reports 6 advisories (3 high) at the planned-at commit, all in the **build/distribution chain** — the rollup pipeline that produces the card bundles users install via HACS, and the Vite chain of the docs site. Build-time advisories don't affect card runtime directly, but the bundler path is this repo's distribution channel; keeping it clean is cheap insurance and keeps real signal visible in future audits. The worst offender is `html-minifier` (ReDoS, no fixed release) reached via `rollup-plugin-minify-html-literals`, an **abandoned** plugin pinned in the shared bundler.

## Current state

- `pnpm audit --prod` summary at `ecfffc3`: **6 vulnerabilities: 1 low, 2 moderate, 3 high.** Known paths:
  - HIGH — `html-minifier <=4.0.0` ReDoS (GHSA-pfq8-rq6v-vf5m), path `packages/tooling/bundler > rollup-plugin-minify-html-literals > minify-html-literals > html-minifier`. **No patched html-minifier release exists** — remediation means removing/replacing the plugin, not bumping.
  - HIGH — `@babel/plugin-transform-modules-systemjs` (GHSA-fv7c-fp4j-7gwp) via `@babel/preset-env` (catalog pins `^7.29.0`; fixed in `>=7.29.4`).
  - LOW — `esbuild >=0.27.3 <0.28.1` (GHSA-g7r4-m6w7-qqqr), 14 paths, all via `apps/web` (`vite`, `@tanstack/*`).
  - Re-run the audit yourself for the full current list; treat the audit output as the source of truth.
- `packages/tooling/bundler/index.js` — shared rollup factory `createCardConfig(options)`; imports `minifyHTML from "rollup-plugin-minify-html-literals"` (line 7) alongside babel/commonjs/json/nodeResolve/terser/typescript/serve. All card packages consume it via `rollup.config.js` (e.g. `packages/flixlix-cards/power-flow-card-plus/rollup.config.js`).
- `packages/tooling/bundler/package.json` — deps all via `catalog:packages`, including `rollup-plugin-minify-html-literals` and `@babel/preset-env`.
- Catalog versions live in `pnpm-workspace.yaml` under `catalogs.packages` (e.g. `"@babel/preset-env": ^7.29.3`, `rollup-plugin-minify-html-literals: ^1.2.6`).
- pnpm settings (including any `overrides`) belong in `pnpm-workspace.yaml`, NOT `.npmrc`/root `package.json` — pnpm 11 ignores them elsewhere. This repo relies on that (existing `allowBuilds`/`publicHoistPattern` entries there are intentional — leave them).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Audit | `pnpm audit --prod` | end state: 0 high |
| Install | `pnpm install` | exit 0 |
| Build all | `pnpm build` | exit 0 |
| Tests | `pnpm test` | all pass |
| Bundle size | `ls -la packages/flixlix-cards/*/dist/*.js` | compared before/after |

## Scope

**In scope** (the only files you should modify):
- `packages/tooling/bundler/index.js`
- `packages/tooling/bundler/package.json`
- `pnpm-workspace.yaml` (ONLY `catalogs.packages` version strings, and only those named here)
- `pnpm-lock.yaml` (via `pnpm install` — never hand-edit)
- `apps/web/package.json` (ONLY if the esbuild fix requires a vite bump)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Any card `src/` code, any rollup option other than the minify plugin.
- `allowBuilds` / `publicHoistPattern` / `packages` globs in `pnpm-workspace.yaml`.
- Major-version migrations of rollup, babel, or vite — minor/patch bumps only in this plan.

## Git workflow

- Branch: `advisor/006-build-chain-advisories`
- Commit style: `chore: :lock: clear high-severity build-chain advisories` (one commit per sub-fix is fine)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Baseline

Run `pnpm audit --prod` (save output) and `pnpm build`; record per-card `dist/*.js` sizes.

**Verify**: build exits 0; sizes and audit list recorded.

### Step 2: Babel fix (smallest)

In `pnpm-workspace.yaml` `catalogs.packages`, bump `"@babel/preset-env"` to `^7.29.4` (or the current patched minor). Run `pnpm install`.

**Verify**: `pnpm audit --prod` no longer lists the systemjs advisory; `pnpm build` exits 0.

### Step 3: Remove `rollup-plugin-minify-html-literals` (measure first)

In `packages/tooling/bundler/index.js`, remove the `minifyHTML` import and its entry from the plugin array. Remove the dep from `packages/tooling/bundler/package.json` and its line from `catalogs.packages`. Run `pnpm install && pnpm build`; compare per-card bundle sizes against Step 1.

- If every card grew **≤5%**: keep the removal (terser still minifies the JS; only whitespace inside `html\`\`` template literals survives).
- If any card grew **>5%**: revert this step, and instead pin a maintained drop-in replacement (e.g. a maintained fork of minify-html-literals that does not depend on vulnerable `html-minifier`) — verify the replacement's dependency tree with `pnpm why html-minifier` before committing to it. If no maintained replacement checks out, see STOP conditions.

**Verify**: `pnpm audit --prod` no longer lists html-minifier; `pnpm build` exits 0; size delta recorded and within policy.

### Step 4: esbuild via vite

Bump `vite` in `apps/web/package.json` to the latest 7.x (and run `pnpm install`) so its esbuild satisfies `>=0.28.1`. The `@tanstack/*: latest` deps will re-resolve on install. If transitive `@tanstack` paths still pin old esbuild, record the residual paths rather than forcing overrides (it's a LOW-severity, dev-server-on-Windows advisory).

**Verify**: `pnpm --filter @flixlix-cards/web build` exits 0 (web is excluded from root `pnpm test`; run `pnpm --filter @flixlix-cards/web test` too); residual esbuild paths, if any, documented.

### Step 5: Final sweep

`pnpm audit --prod`, `pnpm build`, `pnpm test`, `pnpm typecheck`.

**Verify**: 0 high advisories; everything exits 0.

## Test plan

No new unit tests. The gates are: audit output (0 high), every card builds, the full suite passes, and bundle-size deltas are recorded in the final report. A manual smoke (load a built card `dist/*.js` in HA) is recommended for the maintainer post-merge — note it in the PR description.

## Done criteria

- [ ] `pnpm audit --prod` reports 0 high-severity advisories
- [ ] `pnpm build && pnpm test && pnpm typecheck` exit 0
- [ ] Per-card bundle-size delta vs baseline recorded; each ≤5% (or replacement plugin documented)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 3 bundle growth exceeds 5% AND no maintained replacement plugin with a clean tree exists — the maintainer must choose between bytes and the advisory.
- Any catalog bump forces an unrelated major version anywhere in the lockfile diff (`git diff pnpm-lock.yaml` shows a major jump outside babel/vite/esbuild paths).
- `pnpm build` output for any card differs structurally (build errors, missing dist file) after a bump.
- The current audit shows new/different HIGH advisories not covered above — re-plan rather than improvising fixes.

## Maintenance notes

- `rollup-plugin-minify-html-literals` is abandoned; if Step 3 kept it or a fork, revisit at the next rollup major.
- Make `pnpm audit --prod` part of release hygiene (a future CI step — composes with Plan 002).
- Deferred: the `nitro 3.0.260311-beta` pin and `@tanstack/*: latest` ranges in `apps/web` (flagged in Plan 009's notes; stabilizing them is a docs-site decision, not a security fix).
