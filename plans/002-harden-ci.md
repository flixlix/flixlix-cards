# Plan 002: Enforce the lockfile in CI, add typecheck/lint gates, and stop duplicate runs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- .github/workflows/test.yaml .github/workflows/format-check.yaml`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

CI currently installs with `--no-frozen-lockfile`, so a PR whose manifest drifted from `pnpm-lock.yaml` silently resolves *different* dependency versions than every developer machine — non-reproducible builds and an unenforced lockfile are a supply-chain and debugging hazard. On an exact cache hit the install step is skipped entirely against a cached `**/node_modules`, with a broad `restore-keys` fallback that can restore stale module trees. Separately: neither `pnpm typecheck` nor `pnpm lint` runs in CI at all (type errors can merge to main), the workflows run **twice** per PR (`push` + `pull_request` triggers, no concurrency group), no Node version is pinned in the test workflow (the repo requires `>=22.18.0`, `.nvmrc` says `v22.18.0`), and the cache key hashes a root `rollup.config.js` that doesn't exist.

## Current state

- `.github/workflows/test.yaml` — the problematic block (same pattern in `format-check.yaml`):

```yaml
# .github/workflows/test.yaml:3-5
on:
  push:
  pull_request:
```

```yaml
# .github/workflows/test.yaml:17-36
      - name: Cache pnpm modules
        id: cache-modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.pnpm-store
            **/node_modules
          key: ${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml', 'rollup.config.js') }}
          restore-keys: |
            ${{ runner.os }}-

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Install Packages
        if: steps.cache-modules.outputs.cache-hit != 'true'
        run: pnpm install --no-frozen-lockfile
```

There is **no `actions/setup-node` step** in `test.yaml` or `format-check.yaml`. The release workflow (`.github/workflows/release.yml`) already does this correctly — it uses `actions/setup-node@v4` with `node-version-file: ".nvmrc"` and `cache: "pnpm"`; use it as the in-repo exemplar.

- Root scripts (verified): `pnpm test` (turbo, excludes `@flixlix-cards/web`), `pnpm typecheck`, `pnpm lint`, `pnpm format:check`. All pass locally at the planned-at commit.
- `.nvmrc` exists, content `v22.18.0`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Validate YAML | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yaml')); yaml.safe_load(open('.github/workflows/format-check.yaml'))"` | exit 0, no output |
| Frozen install (local proof) | `pnpm install --frozen-lockfile` | exit 0 |
| Tests | `pnpm test` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/test.yaml`
- `.github/workflows/format-check.yaml`
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `.github/workflows/release.yml` — release flow is load-bearing and uses secrets; it already pins Node correctly.
- `.github/workflows/issue-labeler.yaml`
- `pnpm-lock.yaml`, any `package.json` — no dependency changes in this plan.

## Git workflow

- Branch: `advisor/002-harden-ci`
- Commit style: `ci: :lock: enforce frozen lockfile and add typecheck/lint gates`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite `test.yaml`

Replace the triggers, caching, and install with the standard pnpm pattern, add a concurrency group, and add typecheck/lint steps:

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test
```

Note: `actions/setup-node`'s `cache: "pnpm"` caches the pnpm store (not `node_modules`), keyed correctly on the lockfile — install always runs, resolution is always frozen.

**Verify**: the YAML-validation command from the table → exit 0.

### Step 2: Apply the same pattern to `format-check.yaml`

Same triggers, concurrency block (its group will differ via `github.workflow`), pnpm/Node setup, and `pnpm install --frozen-lockfile`; keep the final step `run: pnpm format:check`. Keep `permissions: contents: read`.

**Verify**: the YAML-validation command → exit 0.

### Step 3: Prove the gates pass locally at HEAD

Run `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test`.

**Verify**: all four commands exit 0. If `pnpm typecheck` or `pnpm lint` fails on existing code, see STOP conditions.

## Test plan

No unit tests — workflows are verified by the YAML parse check plus the local run of the exact commands CI will execute (Step 3). After merge, the first PR run is the real verification; the maintainer should watch it.

## Done criteria

- [ ] Both workflow files parse as valid YAML
- [ ] `grep -rn "no-frozen-lockfile" .github/workflows/` → no matches
- [ ] `grep -c "concurrency" .github/workflows/test.yaml .github/workflows/format-check.yaml` → ≥1 each
- [ ] `grep -n "setup-node" .github/workflows/test.yaml` → present
- [ ] `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test` all exit 0 locally
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm install --frozen-lockfile` fails locally — the lockfile is already out of sync with the manifests; that must be fixed (and understood) before CI can enforce it.
- `pnpm typecheck` or `pnpm lint` fails on the existing codebase — do not silence or fix the offending code in this plan; report which package fails so it can be triaged separately.
- The workflow files no longer match the excerpts (drift).

## Maintenance notes

- If a future workflow needs `node_modules` caching for speed, prefer `setup-node`'s pnpm store cache (this plan's pattern) — never cache `**/node_modules` with a `restore-keys` fallback.
- Reviewer should confirm the `push: branches: [main]` filter still gives post-merge signal on main (it does — and `release.yml` also runs there).
- Deferred: adding `pnpm build` as a CI gate (slower; turbo cache in CI would be the right companion — consider `turbo run --cache-dir` remote caching first).
