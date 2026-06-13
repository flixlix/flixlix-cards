# Plan 011: Investigate (and cap or fix) template topics for >4 individual devices

> **Executor instructions**: This is an **investigate-first** plan — Steps 1-2
> produce a finding; Step 3 implements only the matching option. Follow it
> step by step; on any STOP condition, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/shared/src/ui-editor/`
> If `_tryConnectAll` no longer matches the excerpt, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (MED confidence — investigate)
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

The power-flow card maps each individual device's secondary-info template to a topic via a fixed 4-entry array. A 5th+ individual device would produce the topic `"undefinedSecondary"` — all devices past the 4th would share/clobber one broken topic, and their template subscriptions could collide or leak. Whether this is reachable depends on whether anything caps `entities.individual` at 4 — the audit found no cap, but didn't prove its absence. The render layout only supports four positions (left-top, left-bottom, right-top, right-bottom), so the likely correct fix is enforcing the cap, not supporting a 5th device.

## Current state

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts:1076-1082` (inside `_tryConnectAll`):

```ts
if (Array.isArray(value)) {
  const individualKeys = ["left-top", "left-bottom", "right-top", "right-bottom"];
  value.forEach((template, index) => {
    if (template) this._tryConnect(template, `${individualKeys[index]}Secondary`);
  });
}
```

  A mirrored structure exists in `_tryDisconnectAll` (starts line 1137) — check it for the same indexing.
- `_tryConnect` (lines 1090-1135) keys subscriptions by topic in `_unsubRenderTemplates` and stores results in `_templateResults[topic]` — duplicate topics overwrite each other.
- Config validation: `setConfig` in the card's UI editor asserts `cardConfigStruct` (superstruct), defined in `packages/flixlix-cards/power-flow-card-plus/src/ui-editor/schema/_schema-all.ts`. Whether the `individual` array has a max length there is **unknown** — that's investigation target #1.
- The add-device UI: `packages/shared/src/ui-editor/components/individual-devices-editor.ts` — whether its "add" affordance disables at 4 is investigation target #2.
- The energy-flow card likely shares this pattern — check `_tryConnectAll` there too (investigation target #3).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `pnpm --filter power-flow-card-plus test` | all pass |
| All gates | `pnpm test && pnpm typecheck && pnpm lint` | exit 0 |

## Scope

**In scope** (modify only what the chosen option requires):
- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts` (`_tryConnectAll`/`_tryDisconnectAll` only)
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` (same methods, if affected)
- The two cards' `schema/_schema-all.ts` (only if Option A)
- `packages/shared/src/ui-editor/components/individual-devices-editor.ts` (only if Option A)
- Relevant `__tests__` files
- `.changeset/<generated>.md`, `plans/README.md`

**Out of scope**: render/layout code (the four-position layout is by design); everything else.

## Git workflow

- Branch: `advisor/011-individual-template-topics`
- Commit style: `fix: :bug: cap individual devices at four template topics` (adjust to the option chosen)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Establish reachability

(a) Read `cardConfigStruct` in both flow cards' `schema/_schema-all.ts` — is `individual` length-capped? (b) Read `individual-devices-editor.ts` — can the UI add a 5th row? (c) Write a throwaway test (do not commit) constructing a power-flow card with 5 individuals each having `secondary_info.template`, spying on `_tryConnect` (cast to `any`), and asserting which topics are requested.

**Verify**: you can state definitively: "5 individuals is reachable via YAML: yes/no; via UI editor: yes/no; resulting topics: <list>".

### Step 2: Choose the option

- **Option A (expected)** — no cap exists anywhere: enforce max 4. Add the length cap to the superstruct schema in both cards (YAML path), disable the add button at 4 in `individual-devices-editor.ts` (UI path), and make `_tryConnectAll`/`_tryDisconnectAll` defensive (`value.slice(0, 4).forEach(...)` or an `index < individualKeys.length` guard) in both cards.
- **Option B** — a cap already exists and is enforced before `_tryConnectAll` runs: the indexing is safe in practice; add only the defensive guard + a comment, downgrade the finding in your report.

**Verify**: option recorded with the Step 1 evidence.

### Step 3: Implement + test

Implement the chosen option. Convert the Step 1 throwaway test into a committed regression test: 5-individual config → no topic contains `"undefined"`, and (Option A) schema `assert` rejects / UI disables. Run `pnpm changeset` (patch, affected cards) if card behavior changed.

**Verify**: `pnpm test && pnpm typecheck && pnpm lint` → exit 0; new test passes.

## Test plan

- Regression test in `packages/flixlix-cards/power-flow-card-plus/__tests__/` (model after existing tests there; spy pattern via `vi.fn()` as in `sortable-list-card/__tests__/render.test.ts`): 5 individuals with templates → assert the set of topics passed to `_tryConnect` (no `undefined`), and symmetric disconnect.
- Option A: schema rejection test (5 individuals fails `assert`, 4 passes).

## Done criteria

- [ ] Step 1 reachability statement in the report, with file:line evidence
- [ ] `grep -n "individualKeys\[index\]" packages/flixlix-cards/*/src/*.ts` → no unguarded indexing remains
- [ ] New regression test(s) pass; all gates exit 0
- [ ] Changeset exists if card behavior changed
- [ ] No files outside the in-scope list modified (`git status`); `plans/README.md` updated

## STOP conditions

- The maintainer evidently *intends* >4 individuals (e.g. layout code or docs referencing more) — capping would remove a feature; report instead.
- The energy-flow card's template plumbing differs structurally from the excerpt — investigate, report, don't force the same fix.
- Spying on `_tryConnect` proves impossible without DOM/HA connection scaffolding — report what's needed.

## Maintenance notes

- If a future feature allows >4 individuals, topic naming must become index-based (`individual-${index}Secondary`) **and** the four-position layout must be redesigned — this plan deliberately does not start that.
