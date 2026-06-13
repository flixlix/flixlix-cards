# Plan 014: Quantize flow-dot durations so `<animateMotion dur>` stops churning

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/shared/src/utils/compute-flow-rate.ts packages/shared/__tests__/core-utils.test.ts packages/shared/__tests__/calculation-regressions.test.ts`
> If the "Current state" excerpts below no longer match the live code, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

Both flow cards compute the dot-animation duration (`newDur`) from live power values via `computeFlowRate`, a **continuous** linear mapping. A 1 W sensor flicker therefore produces a slightly different duration for up to 6 flows on nearly every relevant state update. Each changed duration (a) rewrites the `dur` attribute on that flow's `<animateMotion>` element and (b) triggers a manual SMIL clock resync — `pauseAnimations()` / `setCurrentTime()` / `unpauseAnimations()` per SVG — in both cards' `_computeRenderData`. On low-end devices (wall tablets, old iPads) this constant churn is a measurable part of why dashboards stutter. Rounding durations to 0.1 s steps makes visually-identical speeds compare equal, so the attribute update and the resync become rare instead of per-tick. The speed difference from rounding is imperceptible (durations range ~1–17 s).

## Current state

- `packages/shared/src/utils/compute-flow-rate.ts` — the only place flow durations are computed. Both cards call `computeFlowRate` for every flow (e.g. `power-flow-card-plus.ts:911-927`, `energy-flow-card-plus.ts:1096-1114`). Current tail of the function:

```ts
// packages/shared/src/utils/compute-flow-rate.ts:30-43
export const computeFlowRate = (
  config: FlowCardPlusConfig,
  value: number,
  total: number
): number => {
  const isNewFlowRateModel = config.use_new_flow_rate_model ?? true;
  const result = isNewFlowRateModel
    ? newFlowRate(config, value)
    : oldFlowRate(config, value, total);
  if (!Number.isFinite(result)) {
    return config.max_flow_rate;
  }
  return result;
};
```

- The downstream consumers you must **not** modify (they benefit automatically — quoted so you can recognize them): the SMIL resync blocks compare `previousDur[flowName] !== newDur[flowName]` and resync when different — `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts:944-958` and `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:1131-1156`. The flow components interpolate the value into the attribute, e.g. `dur="${newDur.solarToHome}s"` in `packages/shared/src/components/flows/solar-to-home.ts`.
- `computeIndividualFlowRate` (same file, lines 45-53) returns config-provided values and is **not** part of this change.
- Existing tests that assert exact outputs (you will update exactly one expectation):
  - `packages/shared/__tests__/core-utils.test.ts:37` → `expect(computeFlowRate(config, 101, 0)).toBe(1);` (on the 0.1 grid — unchanged)
  - `core-utils.test.ts:49-51` → `toBe(10)`, `toBe(1)`, `toBeCloseTo(5.5, 10)` (all on the 0.1 grid — unchanged)
  - `core-utils.test.ts:63` → `expect(computeFlowRate(config, 25, 100)).toBeCloseTo(7.75, 10);` — **7.75 quantizes to 7.8; update this expectation**
  - `packages/shared/__tests__/calculation-regressions.test.ts:156` → `toBe(10)` (unchanged)
- Test convention: vitest, `describe`/`test`/`expect` imported from `"vitest"`, see the header of `packages/shared/__tests__/core-utils.test.ts`. Shared tests run in a **node** environment.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Shared tests | `pnpm --filter @flixlix-cards/shared test` | all pass |
| Card tests | `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` | all pass |
| All gates | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/utils/compute-flow-rate.ts`
- `packages/shared/__tests__/core-utils.test.ts` (the one expectation + new tests)
- `.changeset/<generated>.md` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- The SMIL resync blocks in both card files — they keep working unchanged and Plan 017 owns their future.
- `computeIndividualFlowRate` — individual flow rates come from config, not live power; quantizing them changes user-configured values for no benefit.
- The flow components in `packages/shared/src/components/flows/` — no change needed; `dur` simply stops changing as often.

## Git workflow

- Branch: `advisor/014-quantize-flow-durations`
- Commit style (match repo gitmoji-conventional, e.g. `fix: :bug: hoist deps`): `perf: :zap: quantize flow durations to 0.1s steps`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Quantize in `computeFlowRate`

In `packages/shared/src/utils/compute-flow-rate.ts`, add a private helper and apply it to **both** return paths of `computeFlowRate` (the finite result and the `max_flow_rate` fallback):

```ts
/** Animation durations below 0.1s precision are visually identical; rounding
 *  keeps the <animateMotion dur> attribute stable across small power flickers. */
const quantizeDuration = (seconds: number): number => Math.round(seconds * 10) / 10;
```

`computeFlowRate` then ends with `return quantizeDuration(result);` and the non-finite branch with `return quantizeDuration(config.max_flow_rate);`.

**Verify**: `pnpm --filter @flixlix-cards/shared test` → exactly one failure: `core-utils.test.ts` "computeFlowRate (old model) uses total when provided" (expected 7.75, received 7.8).

### Step 2: Update the one stale expectation and add quantization tests

In `packages/shared/__tests__/core-utils.test.ts`: change line 63's `toBeCloseTo(7.75, 10)` to `toBeCloseTo(7.8, 10)`. Then add tests (same `describe`, model after the neighboring `computeFlowRate` tests):

- two nearby inputs map to the **same** duration: with `use_new_flow_rate_model: true`, `min_expected_power: 0`, `max_expected_power: 100`, `min_flow_rate: 1` (fast), `max_flow_rate: 10` (slow) — `computeFlowRate(config, 50, 0)` and `computeFlowRate(config, 50.4, 0)` both `toBe(5.5)`;
- output is always on the 0.1 grid: for a handful of arbitrary inputs, `expect(Math.round(v * 10) / 10).toBe(v)`;
- the non-finite fallback is quantized: a config with `min_expected_power === max_expected_power` (division by zero → non-finite) and `max_flow_rate: 6.66` returns `6.7`.

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass, including ≥3 new tests.

### Step 3: Full gates + changeset

Run all gates. Create a changeset (patch) for **both** `power-flow-card-plus` and `energy-flow-card-plus` with message: "Perf: quantize flow animation durations to 0.1s steps so tiny power fluctuations no longer restart/resync the dot animations".

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → exit 0; `.changeset/*.md` exists naming both cards.

## Test plan

Covered by Step 2: one updated expectation, ≥3 new tests in `packages/shared/__tests__/core-utils.test.ts` (same-bucket stability, grid alignment, quantized fallback). The existing card render tests (`packages/flixlix-cards/*/__tests__/render.test.ts`) act as the regression net — run them unmodified.

## Done criteria

- [ ] `pnpm test` exits 0, including the new quantization tests
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0
- [ ] `grep -n "quantizeDuration" packages/shared/src/utils/compute-flow-rate.ts` → ≥3 matches (definition + 2 call sites)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Changeset exists (patch, both flow cards)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- After Step 1, tests **other than** the single named expectation fail — that means flow durations are asserted somewhere this plan didn't account for; report which.
- The `computeFlowRate` excerpt doesn't match the live code (drift — possibly Plan 017 landed first and changed duration semantics).
- You are tempted to change the quantization step size or quantize `computeIndividualFlowRate` — both are explicit non-goals; report instead.

## Maintenance notes

- Plan 017 (CSS Motion Path) builds on this: stable durations make its phase-preservation a rare path. If 017 changes how durations are consumed, the quantization stays in `computeFlowRate` regardless.
- Residual churn at bucket boundaries (a value flickering across e.g. 5.45 W-equivalent) is accepted; if a user ever reports visible speed "snapping", the step can be raised/lowered in one place.
- Reviewer: check that defaults like `min_flow_rate: 1.66` quantizing to `1.7` when used as a clamp is acceptable (it is sub-perceptual, but it is a behavior change).
