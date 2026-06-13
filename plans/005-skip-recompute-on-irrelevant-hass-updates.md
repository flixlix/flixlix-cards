# Plan 005: Skip render-data recomputation when a hass update touches no card entity

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/shared/src/`
> If the `willUpdate` excerpts below no longer match the live code, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-card-level-render-tests.md (safety net — do not start before it is DONE)
- **Category**: perf
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

Home Assistant replaces the `hass` object on **every state change of any entity in the installation** — for a busy home, every second or faster. Both flow cards recompute their entire render data (entity resolution, distribution math, tolerance application, individual positioning) on every such update, even when none of the card's configured entities changed. On dashboards the card is the hottest code in the page. Comparing the handful of relevant entity-state references first turns most updates into a no-op.

## Current state

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts:534-552`:

```ts
protected willUpdate(changedProps: PropertyValues): void {
  super.willUpdate(changedProps);
  if (!this._config || !this.hass) {
    return;
  }
  if (
    changedProps.has("hass") ||
    changedProps.has("_config") ||
    changedProps.has("_templateResults") ||
    changedProps.has("_width") ||
    this._renderData === undefined
  ) {
    this.style.setProperty(...);
    this._renderData = this._computeRenderData();
  }
}
```

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:695-722` — same pattern (`_renderData = this._computeRenderData()` at line 720). The energy card *additionally* refreshes energy-collection data elsewhere; that logic is **not** to be touched.
- Key HA facts the implementation relies on: `changedProps.get("hass")` inside `willUpdate` returns the **previous** hass object; HA state objects are immutable, so `oldHass.states[id] !== newHass.states[id]` (reference inequality) is the canonical "this entity changed" check used across HA frontend code.
- Entity IDs live in `this._config.entities` under: `grid`, `solar`, `battery`, `home`, `fossil_fuel_percentage` (each may have `.entity` as a string or an object with `consumption`/`production`, plus `secondary_info.entity`), and `individual` (array, each with `.entity` and `secondary_info.entity`). Read the config types in `packages/shared/src/types/` before implementing — do not guess the shape.
- Shared utils convention: small pure functions under `packages/shared/src/utils/<kebab-name>.ts`, exported via the `"./utils/*"` exports map, tested in `packages/shared/__tests__/`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Shared tests | `pnpm --filter @flixlix-cards/shared test` | all pass |
| Card tests | `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` | all pass |
| All | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/utils/collect-config-entity-ids.ts` (create)
- `packages/shared/src/utils/has-relevant-states-changed.ts` (create)
- `packages/shared/__tests__/relevant-states.test.ts` (create)
- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts` (only the `willUpdate` method)
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` (only the `willUpdate` method)
- `.changeset/<generated>.md` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Template subscription code (`_tryConnectAll` / `_tryConnect`) — template results arrive via `_templateResults`, a separate reactive property that already triggers recompute.
- Energy-collection refresh logic in the energy card (`_refreshEnergyData` and friends) — it has its own update triggers.
- `_computeRenderData()` itself, `render()`, any UI editor file.

## Git workflow

- Branch: `advisor/005-skip-irrelevant-hass-updates`
- Commit style: `perf: :zap: skip renderData recompute when no card entity changed`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `collectConfigEntityIds(config): string[]`

Create the util in shared: walk `config.entities` (all sections listed in "Current state", including every `individual[]` entry and every `secondary_info.entity`), return a deduplicated string array of entity IDs. Handle the grid/battery object form (`{ consumption: string; production: string }`) — read `packages/shared/src/types/` first to enumerate the variants. Write its tests (see Test plan).

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass, including the new file.

### Step 2: `hasRelevantStatesChanged(oldHass, newHass, entityIds): boolean`

Also in shared. Return `true` when `oldHass` is undefined, when `oldHass.locale !== newHass.locale` or `oldHass.themes !== newHass.themes` (formatting/colors depend on these), or when any `entityIds` entry has `oldHass.states[id] !== newHass.states[id]`. Keep it dependency-free (parameter types may be structural — `{ states: Record<string, unknown>; locale?: unknown; themes?: unknown }` — to stay test-friendly).

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass.

### Step 3: Wire into the power-flow card

In `willUpdate`, replace the bare `changedProps.has("hass")` trigger: compute `const oldHass = changedProps.get("hass")` and treat the hass change as relevant only when `hasRelevantStatesChanged(oldHass, this.hass, collectConfigEntityIds(this._config))` is true. The `_config` / `_templateResults` / `_width` / `_renderData === undefined` triggers stay exactly as they are. Cache the collected IDs when `_config` changes if straightforward; otherwise collecting per-update is acceptable (it's cheap relative to `_computeRenderData`).

**Verify**: `pnpm --filter power-flow-card-plus test` → all pass (including Plan 004's renderData suite).

### Step 4: Wire into the energy-flow card

Same change in `energy-flow-card-plus.ts:695-722`. Note its renderData may also depend on collection state updated by its own refresh logic — that path sets reactive properties that independently trigger `willUpdate`, so the guard only filters the `hass`-driven trigger. Re-read the method's surrounding triggers before editing.

**Verify**: `pnpm --filter energy-flow-card-plus test` → all pass.

### Step 5: Full verification + changeset

`pnpm test && pnpm typecheck && pnpm lint && pnpm build`. Changeset: both flow cards, **patch**, message: "Perf: skip render-data recomputation when an update touches no configured entity".

**Verify**: all exit 0; changeset file exists.

## Test plan

New `packages/shared/__tests__/relevant-states.test.ts` (model after `power-distribution.test.ts`):
- `collectConfigEntityIds`: full config (grid object form + secondaries + 2 individuals) → exact expected ID list; minimal config → only the configured IDs; no duplicates when one entity appears twice.
- `hasRelevantStatesChanged`: same references → `false`; one relevant state object replaced → `true`; an *irrelevant* entity replaced → `false`; `oldHass === undefined` → `true`; changed `locale` reference → `true`.
- Card level: Plan 004's `_computeRenderData` tests are the regression net; additionally add one test per card asserting `willUpdate` does NOT replace `_renderData` (same object reference) when called with a new hass in which only an unrelated entity changed, and DOES replace it when a configured entity changed.

## Done criteria

- [ ] `pnpm test` exits 0, including ≥5 new shared tests and 2 new per-card willUpdate tests
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0
- [ ] `grep -n "hasRelevantStatesChanged" packages/flixlix-cards/*/src/*.ts` → matches in exactly the two flow cards
- [ ] Changeset exists (patch, both flow cards)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 004's status in `plans/README.md` is not DONE.
- The `willUpdate` excerpts don't match the live code (drift).
- You find render output reading `hass` state for entities that `collectConfigEntityIds` cannot know statically (e.g. template-discovered entities) — the guard would cause stale renders; report instead of widening the heuristic.
- Any Plan 004 test fails after Step 3/4 — the guard is wrong; do not loosen the test.

## Maintenance notes

- Anyone adding a new configurable entity to either card MUST extend `collectConfigEntityIds` — otherwise the card goes stale for that entity. Reviewer: this is the thing to check in every future config-schema PR; consider a comment on the config type pointing here.
- Template-driven secondaries are exempt by design: they arrive via `_templateResults`, which still triggers recompute.
- Deferred: the same guard for `energy-breakdown-card` — different update model (energy collections), evaluate separately.
