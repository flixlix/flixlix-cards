# Plan 013: Showcase the UI editor in the docs site (power-flow card first)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git status --short apps/web/` — the working
> tree at planning time carried **uncommitted changes** in `apps/web` (sidebar,
> doc-primitives, routes). If uncommitted changes are still present in the
> files you must touch, STOP and coordinate with the maintainer before editing.
> Then: `git diff --stat ecfffc3..HEAD -- apps/web/src/routes/_docs/`.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (asset capture requires a human/HA instance — see Step 2)
- **Category**: direction
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

All four cards ship a substantial visual config editor (~1,800 lines of editor code), and "UI editor & YAML support" is an advertised feature — but the docs site demonstrates only YAML. Users who don't know Home Assistant's editor UX never learn the easiest configuration path exists, and the feature that most differentiates these cards from YAML-only cards is invisible. One docs section with a short capture of the editor closes the gap; this plan does the power-flow card first as the pattern.

## Current state

- Editor code exists per card: `packages/flixlix-cards/<card>/src/ui-editor/ui-editor.ts` (e.g. power-flow's editor has pages for grid/solar/battery/fossil/home/individual/advanced — see its `CONFIG_PAGES`, lines 23-62).
- Docs routes live under `apps/web/src/routes/_docs/<card-slug>/` — enumerate with `ls apps/web/src/routes/_docs/` and read the power-flow card's configuration page before writing anything.
- Docs pages are built from shared primitives in `apps/web/src/components/docs/doc-primitives.tsx` (NOTE: modified-but-uncommitted at planning time) — match whatever heading/callout/image components the existing pages use; do not invent new primitives.
- Static assets convention: `apps/web/public/` (contains `videos/energy-demo.mp4` ~662KB and `power-demo.mp4` ~202KB — videos are an accepted asset type; keep any new capture in that size class).
- Local HA for capture: `pnpm start:hass` (Docker, :8123) + card dev server `pnpm dev` in `packages/flixlix-cards/power-flow-card-plus` (serves on **:5001**), add `http://<ip>:5001/power-flow-card-plus.js` as a dashboard resource.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Docs dev server | `pnpm --filter @flixlix-cards/web dev` | site on :3000 |
| Web build | `pnpm --filter @flixlix-cards/web build` | exit 0 |
| Web tests | `pnpm --filter @flixlix-cards/web test` | all pass |
| Lint/format | `pnpm --filter @flixlix-cards/web lint && pnpm --filter @flixlix-cards/web format:check` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- The power-flow card's configuration docs route under `apps/web/src/routes/_docs/` (exact file determined in Step 1)
- `apps/web/public/images/` or `apps/web/public/videos/` (new asset(s))
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `doc-primitives.tsx`, sidebar/nav components (uncommitted user work lives there).
- The other three cards' docs (follow-up after the pattern is approved).
- Any card source code.

## Git workflow

- Branch: `advisor/013-ui-editor-docs`
- Commit style: `docs: :memo: showcase the UI editor on power-flow docs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Locate the insertion point and the pattern

`ls apps/web/src/routes/_docs/` to find the power-flow configuration page; read it fully, plus one other docs page, to learn the heading/image/callout idioms in use. Decide where a "Using the UI editor" section belongs (immediately before the YAML reference is the natural slot).

**Verify**: you can name the exact file and the primitives you'll reuse.

### Step 2: Obtain the capture (human checkpoint)

Producing the asset needs a running HA with the card installed. If you (the executor) can run Docker + a browser: follow the "Local HA for capture" recipe in Current state, open the card's edit dialog, and capture (a) a still of the editor's main page and (b) optionally a ≤15s screen recording navigating to the grid page and changing a value. Target: PNG ≤300KB / MP4 ≤700KB, light theme.
If you cannot produce the capture: write the section with a clearly-marked placeholder asset path, emit the capture checklist above in your report, and mark the plan BLOCKED(asset) in `plans/README.md` — do not ship a placeholder to production.

**Verify**: asset file(s) exist under `apps/web/public/…` at the budgeted size, or BLOCKED(asset) recorded.

### Step 3: Write the section

Add "Using the UI editor" to the configuration page: 2-3 sentences (the editor covers every option on this page; reachable via the card's edit dialog in HA), the asset, and one sentence noting YAML remains fully supported below. Match the page's existing tone and components.

**Verify**: `pnpm --filter @flixlix-cards/web dev` → section renders correctly (check the page in a browser or via curl for the heading text); `pnpm --filter @flixlix-cards/web build && pnpm --filter @flixlix-cards/web lint && pnpm --filter @flixlix-cards/web format:check` → exit 0.

## Test plan

Docs-site change: the gate is web build + lint + format + a visual render check. If the docs routes have tests (check `apps/web/src` for `*.test.tsx` touching docs pages — none were observed at planning time), keep them green.

## Done criteria

- [ ] "Using the UI editor" section on the power-flow configuration page, using existing doc primitives
- [ ] Real asset within size budget (or plan marked BLOCKED(asset) with the capture checklist delivered)
- [ ] `pnpm --filter @flixlix-cards/web build`, `lint`, `format:check`, `test` all exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Uncommitted user changes exist in the file you need to edit (drift check) — coordinate first.
- The docs routes' structure differs materially from what Step 1 expects (e.g. content is MDX/generated rather than TSX) — report the actual mechanism.
- The asset cannot be produced AND the maintainer hasn't pre-supplied one — BLOCKED(asset), per Step 2.

## Maintenance notes

- Once the pattern is approved, replicate for the other three cards (each editor differs — capture per card). Keep captures refreshed when editor UX changes materially; a stale screenshot is worse than none.
- Asset weight: the docs site already ships ~860KB of demo video; keep cumulative editor captures within the same order of magnitude.
