# Plan 005: Make CI verify the web app and shared UI package

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update this plan's status row in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5e31904..HEAD -- package.json apps/web/package.json apps/web/vitest.config.ts apps/web/src/components/docs/docs-search-index.ts apps/web/src/components/docs/docs-search-index.test.ts packages/ui/package.json packages/ui/src/components/command.tsx packages/ui/src/components/dialog.tsx packages/ui/src/components/dock.tsx packages/ui/src/components/image-lightbox.tsx .github/workflows/test.yaml`
> Stop if scripts, the search API, the four UI error sites, or CI steps no longer match the excerpts below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `5e31904`, 2026-07-25

## Why this matters

The root typecheck reports success while silently skipping both `@flixlix-cards/web` and `@flixlix-cards/ui`, because neither package defines a `typecheck` task. The root test command explicitly excludes the web package even though it declares Vitest, and CI never runs a production build. Adding the missing gates immediately exposes four existing UI type errors, so the baseline must repair those errors and add a small web regression test before enabling CI enforcement.

## Current state

- `package.json` orchestrates Turbo tasks. Its test script is `"npx turbo test --filter=!@flixlix-cards/web"`.
- `apps/web/package.json:9-16` has build, test, lint, and format scripts but no typecheck script.
- `packages/ui/package.json:6-10` has lint and format scripts but no typecheck or build script.
- `.github/workflows/test.yaml:31-41` installs dependencies, typechecks, lints, and tests, but never builds.
- `apps/web/src/components/docs/docs-search-index.ts:609-670` exports static entries and the pure `searchDocs` function.

The web TypeScript baseline already succeeds:

```text
pnpm --filter @flixlix-cards/web exec tsc --noEmit
exit 0
```

The UI TypeScript baseline currently fails with exactly four errors:

```text
src/components/command.tsx: Module "@flixlix-cards/ui/lib/utils" has no exported member "cn".
src/components/dialog.tsx: Module "@flixlix-cards/ui/lib/utils" has no exported member "cn".
src/components/dock.tsx: Cannot find module "@flixlix-cards/ui/components/animate-ui/icons/icon".
src/components/image-lightbox.tsx: Cannot find module "@flixlix-cards/ui/components/morphing-dialog".
```

`packages/ui/src/lib/utils.ts` is empty. Other UI components use the canonical `cn` package directly:

```ts
import { cn } from "@flixlix-cards/cn";
```

Repository-wide source search finds no consumers of `Dock`, `ImageLightbox`, `MorphingDialog`, or `AnimateIcon` outside the two broken files. The UI package is private. The low-risk baseline is therefore to correct the two `cn` imports and remove the two orphaned, incomplete components instead of inventing missing component families.

The web production build was verified at the planned commit:

```text
pnpm --filter @flixlix-cards/web build
✓ built
```

The web test command currently exits 1 because no test files exist. Vitest also loads the full TanStack/Nitro Vite plugin stack from `vite.config.ts`, which is unnecessary for the planned pure unit test. Add a dedicated test config before running the first web test.

## Commands you will need

| Purpose        | Command                                      | Expected on success             |
| -------------- | -------------------------------------------- | ------------------------------- |
| Web typecheck  | `pnpm --filter @flixlix-cards/web typecheck` | exit 0                          |
| UI typecheck   | `pnpm --filter @flixlix-cards/ui typecheck`  | exit 0                          |
| Web tests      | `pnpm --filter @flixlix-cards/web test`      | exit 0; new tests pass          |
| Root typecheck | `pnpm typecheck`                             | exit 0; web and UI tasks appear |
| Root tests     | `pnpm test`                                  | exit 0; web task appears        |
| Root build     | `pnpm build`                                 | exit 0                          |
| Lint           | `pnpm lint`                                  | exit 0                          |
| Format check   | `pnpm format:check`                          | exit 0                          |

## Scope

**In scope**:

- `package.json`
- `apps/web/package.json`
- `apps/web/vitest.config.ts`, create
- `apps/web/src/components/docs/docs-search-index.test.ts`, create
- `packages/ui/package.json`
- `packages/ui/src/components/command.tsx`
- `packages/ui/src/components/dialog.tsx`
- `packages/ui/src/components/dock.tsx`, delete after the required consumer check
- `packages/ui/src/components/image-lightbox.tsx`, delete after the required consumer check
- `.github/workflows/test.yaml`
- `plans/README.md`, status row only

**Out of scope**:

- `turbo.json`; its incorrect shared Vitest input path is tracked as a separate finding
- `packages/ui/src/lib/utils.ts`; leave the empty stub unchanged
- Adding or recreating Animate UI or morphing-dialog components
- Broad web component or route tests
- Dependency upgrades
- CI caching or deployment changes
- Source changes unrelated to the four existing UI type errors

## Git workflow

- Branch: `advisor/005-enforce-web-ui-ci`
- Prefer two commits: `fix: restore ui typecheck baseline`, then `ci: verify web and ui packages`
- Do not push or open a PR unless the operator instructs it
- Do not add code comments

## Steps

### Step 1: Confirm orphaned UI components have no consumers

Run:

```bash
rg 'components/(dock|image-lightbox)|\bDock\b|ImageLightbox|MorphingDialog|AnimateIcon' . --glob '*.{ts,tsx}'
```

Expected result: matches occur only in `packages/ui/src/components/dock.tsx` and `packages/ui/src/components/image-lightbox.tsx`.

If any consumer exists outside those files, stop. Do not delete a consumed component or invent its missing dependency in this plan.

**Verify**: The search output contains no external consumer.

### Step 2: Restore a clean UI TypeScript baseline

1. In `command.tsx` and `dialog.tsx`, replace the empty local-utils import with `import { cn } from "@flixlix-cards/cn";`.
2. Delete `dock.tsx` and `image-lightbox.tsx` only after Step 1 confirms they are orphaned.
3. Add `"typecheck": "tsc --noEmit"` to `packages/ui/package.json`.
4. Do not alter `packages/ui/src/lib/utils.ts` or add replacement components.

**Verify**:

- `pnpm --filter @flixlix-cards/ui typecheck` exits 0 with no errors
- `pnpm --filter @flixlix-cards/ui lint` exits 0
- `pnpm --filter @flixlix-cards/ui format:check` exits 0

### Step 3: Add the web typecheck task

Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json`, following the script ordering used by other workspace packages.

**Verify**: `pnpm --filter @flixlix-cards/web typecheck` exits 0 with no errors.

### Step 4: Add a pure search-index regression suite

Create `apps/web/vitest.config.ts` first:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

This config deliberately excludes TanStack Start, Nitro, Tailwind, and browser plugins because the initial suite tests a pure data module. Keep aliases aligned with `tsconfig.json` through the existing `vite-tsconfig-paths` dependency.

Then create `apps/web/src/components/docs/docs-search-index.test.ts` and import `searchDocs`.

Add tests for:

1. Empty and whitespace-only queries return an empty array.
2. `"collection key"` returns an Energy Flow Card Plus configuration entry containing `/energy-flow-card-plus/configuration`.
3. A multi-token query such as `"sortable installation"` returns only entries whose searchable data satisfies both tokens, with the installation page present.
4. The `max` argument limits the result count.
5. An unknown query returns an empty array.

Keep tests deterministic and independent of route rendering or the DOM. Do not snapshot the full index.

**Verify**: `pnpm --filter @flixlix-cards/web test` exits 0 and reports the new test file.

### Step 5: Include web tests in the root command

Replace the root test script with the local Turbo command and remove the web exclusion:

```json
"test": "turbo test"
```

Do not change Turbo task inputs in this plan.

**Verify**: `pnpm test` exits 0 and its package-scope output includes `@flixlix-cards/web:test`.

### Step 6: Add production builds to CI

In `.github/workflows/test.yaml`, add a build step after typecheck and before lint:

```yaml
- name: Build
  run: pnpm build
```

Keep permissions, install behavior, and existing checks unchanged.

**Verify**:

- `pnpm exec prettier --check .github/workflows/test.yaml` exits 0; Prettier must parse the YAML successfully.
- `pnpm build` exits 0 locally.

### Step 7: Run the complete local CI sequence

Run the same substantive commands as CI:

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test
pnpm format:check
```

**Verify**:

- Every command exits 0
- Typecheck output includes both `@flixlix-cards/web:typecheck` and `@flixlix-cards/ui:typecheck`
- Test output includes `@flixlix-cards/web:test`
- `git diff --name-only` lists only in-scope files and `plans/README.md` if updated

## Test plan

- Add a pure Vitest suite for `searchDocs`, covering empty, matching, multi-token, capped, and unknown queries.
- Use direct value assertions; do not use snapshots or mount the TanStack app.
- Existing card and shared suites continue to pass through the unfiltered root test command.
- UI typechecking is the regression gate for the repaired imports and removed orphan files.
- Verification: focused web tests and the complete root CI sequence pass.

## Done criteria

- [ ] Web package defines and passes `typecheck`
- [ ] UI package defines and passes `typecheck`
- [ ] UI typecheck has zero missing-export or missing-module errors
- [ ] Orphaned UI files are deleted only after the consumer search passes
- [ ] Web has a dedicated Node-environment Vitest config that does not load application plugins
- [ ] Web has a deterministic `searchDocs` test suite
- [ ] Root `pnpm test` includes web
- [ ] CI runs `pnpm build`
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`, and `pnpm format:check` all exit 0
- [ ] No dependencies or Turbo configuration are changed
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report if:

- `dock.tsx` or `image-lightbox.tsx` has a consumer outside its own file.
- The operator identifies either orphaned component as a required private API.
- UI typechecking exposes errors beyond the four documented baseline errors.
- Web typechecking no longer passes before source changes.
- The web build requires deployment credentials or network-only data.
- Adding web tests requires changing application source instead of testing the exported pure function.
- Any complete-CI command fails twice after a reasonable correction.

## Maintenance notes

- Future workspace packages must define a `typecheck` task or explicitly document why Turbo should skip them.
- Keep the root test command unfiltered unless a package is excluded with a documented reason and an independent CI job.
- Reviewers should confirm the deleted UI components were truly orphaned at execution time.
- Fixing Turbo's stale shared-test-config input remains separate and should follow this plan.
