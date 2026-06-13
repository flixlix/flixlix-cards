# Plan 007: Extract a shared base class for the card UI editors (flow cards first)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/ui-editor/ packages/flixlix-cards/energy-flow-card-plus/src/ui-editor/ packages/shared/src/ui-editor/`
> If the editors changed since this plan was written, compare against the
> "Current state" excerpts; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/003-purge-lit2-from-shared.md (touches the same shared editor dir), plans/004-card-level-render-tests.md (general safety net)
- **Category**: tech-debt
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

The four card editors total 1,826 lines (`power-flow` 382, `energy-flow` 402, `energy-breakdown` 539, `sortable-list` 503), and the two flow-card editors are near-clones — lines 23-62 (`CONFIG_PAGES` + class scaffolding) are **byte-identical** between them (verified by hash), and the page-navigation, `setConfig`+`assert`, and legacy-migration machinery repeats. Every editor UX change is made four times and the copies are already drifting. This plan extracts the shared machinery for the two flow cards only; the other two editors are evaluated, not migrated.

## Current state

- `packages/flixlix-cards/power-flow-card-plus/src/ui-editor/ui-editor.ts` — the structure to extract:
  - lines 23-62: `CONFIG_PAGES: { page: ConfigPage; icon?: string; schema?: any }[]` (grid/solar/battery/fossil/home/individual/advanced)
  - lines 64-87: class declaration `@customElement("power-flow-card-plus-editor") ... implements LovelaceCardEditor`, `hass` property, `_config`/`_configEntities`/`_currentConfigPage` state, `setConfig` with `assert(config, cardConfigStruct)`, `connectedCallback` calling `loadHaForm()`, `_editDetailElement`, `_goBack`
  - lines 89-136: legacy-field detection/migration/alert (`watt_threshold` → `kilo_threshold` etc., fires `config-changed` via `fireEvent`)
  - lines 138-160+: legacy individual1/individual2 migration
- `packages/flixlix-cards/energy-flow-card-plus/src/ui-editor/ui-editor.ts:23-62` — byte-identical to the power-flow block (same `CONFIG_PAGES` content), with its own struct/schema imports and its own legacy migrations further down.
- Shared editor infra already exists and is imported by both: `packages/shared/src/ui-editor/` (`components/` incl. `individual-devices-editor`, `link-subpage`, `subpage-header`; `schema/`; `utils/load-ha-form`). New shared code goes here; the shared package exposes it via the `"./ui-editor/*": "./src/ui-editor/*.ts"` exports map in `packages/shared/package.json`.
- Each flow card has an editor test: `packages/flixlix-cards/power-flow-card-plus/__tests__/ui-editor.test.ts` and the energy-flow sibling — these are the regression gates. Read them before refactoring.
- Conventions: Lit 3 (`lit`, `lit/decorators.js` — after Plan 003), `fireEvent` from `custom-card-helpers`, struct validation with `superstruct`'s `assert`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Editor tests | `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` | all pass |
| All | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/ui-editor/base-editor.ts` (create)
- `packages/flixlix-cards/power-flow-card-plus/src/ui-editor/ui-editor.ts`
- `packages/flixlix-cards/energy-flow-card-plus/src/ui-editor/ui-editor.ts`
- The two cards' `__tests__/ui-editor.test.ts` only if imports/structure require it (assertions must keep passing unchanged where possible)
- `.changeset/<generated>.md` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `energy-breakdown-card` and `sortable-list-card` editors — evaluate in the final report only; their page structure differs and migrating them speculatively risks breaking fresh code.
- The schemas under `packages/shared/src/ui-editor/schema/` and per-card `schema/_schema-all.ts` — schema content is card-specific by design.
- Custom element names (`power-flow-card-plus-editor`, `energy-flow-card-plus-editor`) — HA resolves editors by these exact names; they must not change.

## Git workflow

- Branch: `advisor/007-shared-editor-base`
- Commit per step: `refactor: :recycle: extract BaseCardEditor` / `refactor: :recycle: migrate <card> editor to BaseCardEditor`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read both editors fully and diff them

Read both flow-card `ui-editor.ts` files end to end. Produce (in your working notes) the exact list of: identical blocks, parameterizable blocks (struct, schemas, card-specific pages), and genuinely divergent blocks. This determines the base-class surface — do not skip.

**Verify**: `diff <(sed -n '23,62p' packages/flixlix-cards/power-flow-card-plus/src/ui-editor/ui-editor.ts) <(sed -n '23,62p' packages/flixlix-cards/energy-flow-card-plus/src/ui-editor/ui-editor.ts)` → empty (confirms the identical block is still identical).

### Step 2: Create `BaseCardEditor` in shared

`packages/shared/src/ui-editor/base-editor.ts`: an abstract `LitElement implements LovelaceCardEditor` providing — `hass` property; `_config`/`_configEntities`/`_currentConfigPage` state; `setConfig` calling `assert(config, this.configStruct)` with `protected abstract configStruct`; `connectedCallback` → `loadHaForm()`; `_editDetailElement` / `_goBack`; page-navigation rendering driven by a `protected abstract configPages` getter; an overridable hook for card-specific alerts (legacy migrations stay in the subclasses). Generic over the config type. No `@customElement` decorator on the base.

**Verify**: `pnpm typecheck` → exit 0 (base compiles; nothing consumes it yet).

### Step 3: Migrate the power-flow editor

Make `PowerFlowCardPlusEditor extends BaseCardEditor<PowerFlowCardPlusConfig>`, deleting the now-inherited members; keep `CONFIG_PAGES` (returned from the `configPages` getter), both legacy migrations, and the `@customElement("power-flow-card-plus-editor")` registration in the card file.

**Verify**: `pnpm --filter power-flow-card-plus test` → all pass with assertions unchanged.

### Step 4: Migrate the energy-flow editor

Same treatment.

**Verify**: `pnpm --filter energy-flow-card-plus test` → all pass.

### Step 5: Full verification, evaluation report, changeset

`pnpm test && pnpm typecheck && pnpm lint && pnpm build`. Then read the `energy-breakdown-card` and `sortable-list-card` editors and write a short evaluation (in the PR description / final report): could they adopt `BaseCardEditor`, what diverges, estimated effort. Do not migrate them. Changeset: both flow cards, **patch**, "Refactor: shared editor base class (no behavior change)".

**Verify**: all exit 0; line-count check `wc -l packages/flixlix-cards/{power-flow-card-plus,energy-flow-card-plus}/src/ui-editor/ui-editor.ts` shows a meaningful reduction (expect roughly 150+ lines removed combined).

## Test plan

- Primary gate: the two existing `ui-editor.test.ts` suites pass **without weakening any assertion**.
- Add to each suite (or a new shared test in `packages/shared/__tests__/`): page navigation (`_editDetailElement("grid")` sets `_currentConfigPage`; `_goBack()` resets to `null`), and `setConfig` rejecting an invalid config (superstruct assert throws).
- `pnpm build` proves the bundles still assemble with the new import graph.

## Done criteria

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all exit 0
- [ ] Both flow-card editors extend `BaseCardEditor`; `grep -c "extends BaseCardEditor" packages/flixlix-cards/*/src/ui-editor/ui-editor.ts` → exactly 2
- [ ] Custom element names unchanged: `grep -n "customElement(\"power-flow-card-plus-editor\")" packages/flixlix-cards/power-flow-card-plus/src/ui-editor/ui-editor.ts` → 1 match (same for energy-flow)
- [ ] No existing test assertion weakened (review the test diff)
- [ ] Evaluation note for the other two editors written in the report
- [ ] Changeset exists (patch, both flow cards); `plans/README.md` updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 reveals the editors have diverged materially since planning (the Step 1 `diff` is non-empty) — the extraction surface must be re-derived, which is a judgment call for the advisor.
- The render method's markup differs between the two editors in ways the base class cannot parameterize without card-specific conditionals — extract only the non-render machinery in that case and say so.
- Any existing `ui-editor.test.ts` assertion must be weakened to pass.
- TypeScript generics around `LovelaceCardEditor`/config typing force `any` leakage into the public surface.

## Maintenance notes

- New cards should extend `BaseCardEditor` from day one — note this in `CLAUDE.md` (Plan 008).
- Reviewer focus: editor behavior in HA itself (page nav, save events) — tests cover logic, not HA's form rendering; a manual editor open/save in HA before release is warranted.
- Deferred: migrating `energy-breakdown-card` / `sortable-list-card` editors (pending the Step 5 evaluation), and replacing `fireEvent` from `custom-card-helpers` (tracked under the custom-card-helpers question in Plan 009's notes).
