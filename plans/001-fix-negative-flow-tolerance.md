# Plan 001: Make tolerance helpers handle negative flow values instead of hiding them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/shared/src/states/tolerance/base.ts packages/shared/src/states/raw/individual/has-individual-object.ts packages/shared/__tests__/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

Individual devices (e.g. a heat pump, an EV charger) configured in Power Flow Card Plus or Energy Flow Card Plus can legitimately report **negative** values — the codebase explicitly supports this (it inverts the flow animation for negative states). But the tolerance helper `isAboveTolerance` evaluates `value >= tolerance`, which is `false` for every negative number, so `hasIndividualObject` returns `false` and the device **disappears from the card entirely** whenever its reading is negative and `display_zero` is off (the default). Users see their device vanish exactly when it starts exporting/returning power.

## Current state

- `packages/shared/src/states/tolerance/base.ts` — the two helpers, entire file (12 lines):

```ts
// packages/shared/src/states/tolerance/base.ts:1-12
export const isAboveTolerance = (value: number | null, tolerance: number): boolean =>
  !!value && value >= tolerance;

export const adjustZeroTolerance = (
  value: number | null,
  tolerance: number | undefined
): number => {
  if (!value) return 0;
  if (!tolerance) return value;

  return isAboveTolerance(value, tolerance) ? value : 0;
};
```

- `packages/shared/src/states/raw/individual/has-individual-object.ts:9` — calls `isAboveTolerance(state, tolerance)`; when it returns `false` and `displayZero` is `false`, the individual device is hidden (`has: false`).

- Proof that negative states are intended to be displayed — `packages/shared/src/states/raw/individual/get-individual-object.ts:91-96`:

```ts
const has = hasIndividualObject(displayZero, state, displayZeroTolerance);
const isStateNegative = state && state < 0;
const userConfiguredInvertAnimation = field?.inverted_animation || false;
const invertAnimation = isStateNegative
  ? !userConfiguredInvertAnimation
  : userConfiguredInvertAnimation;
```

- Other callers of `adjustZeroTolerance` (`power-flow-card-plus.ts:762-785`, `energy-flow-card-plus.ts:953-975`) pass directional magnitudes (`fromGrid`, `toGrid`, `solar.total`, `fromBattery`, `toBattery`) that are non-negative by construction — they are unaffected by this fix but are covered by the regression tests below.

- Test conventions: vitest, plain `describe`/`test`/`expect`, files live in `packages/shared/__tests__/*.test.ts`. Exemplar: `packages/shared/__tests__/power-distribution.test.ts`.

## Commands you will need

| Purpose   | Command                                        | Expected on success |
|-----------|------------------------------------------------|---------------------|
| Install   | `pnpm install`                                 | exit 0              |
| Tests (shared only) | `pnpm --filter @flixlix-cards/shared test` | all pass     |
| Tests (all) | `pnpm test`                                  | all pass            |
| Typecheck | `pnpm typecheck`                               | exit 0              |
| Lint      | `pnpm lint`                                    | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/states/tolerance/base.ts`
- `packages/shared/__tests__/tolerance.test.ts` (create)
- `.changeset/<generated>.md` (create via `pnpm changeset`)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):
- `packages/shared/src/states/raw/individual/has-individual-object.ts` — its logic is correct once the helper is fixed.
- `power-flow-card-plus.ts` / `energy-flow-card-plus.ts` call sites — no change needed there.
- `get-individual-object.ts` — the `invertAnimation` logic already handles negatives.

## Git workflow

- Branch: `advisor/001-fix-negative-flow-tolerance`
- Commit style: gitmoji + conventional, e.g. `fix: :bug: handle negative flows in tolerance helpers` (matches `git log`, e.g. "fix: :bug: hoist deps")
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write failing regression tests

Create `packages/shared/__tests__/tolerance.test.ts` covering the table in "Test plan" below. The two negative-value cases must FAIL against the current code.

**Verify**: `pnpm --filter @flixlix-cards/shared test` → the new negative-value tests fail, all pre-existing tests pass.

### Step 2: Fix the helpers

Replace the bodies in `packages/shared/src/states/tolerance/base.ts` so magnitude is compared, sign is preserved, and `0`/`null` behavior is unchanged:

```ts
export const isAboveTolerance = (value: number | null, tolerance: number): boolean =>
  value !== null && value !== 0 && Math.abs(value) >= tolerance;

export const adjustZeroTolerance = (
  value: number | null,
  tolerance: number | undefined
): number => {
  if (!value) return 0;
  if (!tolerance) return value;

  return isAboveTolerance(value, tolerance) ? value : 0;
};
```

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass, including the new tests.

### Step 3: Full-repo verification + changeset

Run `pnpm typecheck`, `pnpm test`, `pnpm lint` from the repo root. Then run `pnpm changeset`: select **power-flow-card-plus** and **energy-flow-card-plus**, bump **patch**, message: "Fix: individual devices with negative readings are no longer hidden when display_zero is off".

**Verify**: `pnpm test` → exit 0; `ls .changeset/*.md | grep -v README` → one new file.

## Test plan

New file `packages/shared/__tests__/tolerance.test.ts`, modeled after `power-distribution.test.ts`:

| Case | Call | Expected |
|------|------|----------|
| null input | `adjustZeroTolerance(null, 5)` | `0` |
| zero input | `adjustZeroTolerance(0, 5)` | `0` |
| positive below tolerance | `adjustZeroTolerance(0.5, 5)` | `0` |
| positive at/above tolerance | `adjustZeroTolerance(7, 5)` | `7` |
| no tolerance | `adjustZeroTolerance(7, undefined)` | `7` |
| **negative above tolerance (regression)** | `adjustZeroTolerance(-50, 5)` | `-50` |
| negative below tolerance | `adjustZeroTolerance(-0.5, 5)` | `0` |
| isAboveTolerance zero | `isAboveTolerance(0, 0)` | `false` |
| **isAboveTolerance negative (regression)** | `isAboveTolerance(-50, 0)` | `true` |

Also import `hasIndividualObject` from `packages/shared/src/states/raw/individual/has-individual-object` and assert `hasIndividualObject(false, -50, 0) === true` (the user-visible bug).

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; `packages/shared/__tests__/tolerance.test.ts` exists with the 10 cases above
- [ ] `pnpm lint` exits 0
- [ ] A changeset file exists naming both flow cards (patch)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `tolerance/base.ts` no longer matches the excerpt above (drift).
- Any *pre-existing* test in `packages/shared/__tests__/` fails after Step 2 — that means a caller depends on negatives being zeroed; do not "fix" that test, report it.
- You find another caller of `isAboveTolerance`/`adjustZeroTolerance` beyond the four listed in "Current state" (`grep -rn "isAboveTolerance\|adjustZeroTolerance" packages --include="*.ts" | grep -v node_modules`).

## Maintenance notes

- Any future "display zero tolerance" option on new fields should reuse these helpers — they now define tolerance as a magnitude check.
- Reviewer should scrutinize: the energy-flow card sums directional magnitudes after `adjustZeroTolerance`; confirm no call site feeds it signed net values.
- Deferred: `computeFlowRate` (`packages/shared/src/utils/compute-flow-rate.ts:39`) silently falls back to `max_flow_rate` on non-finite results (e.g. `min_expected_power === max_expected_power`). Cosmetic; covered by Plan 004's test scope, not this plan.
