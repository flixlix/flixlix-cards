# Plan 003: Keep home-ring circumferences finite at zero consumption

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update this plan's status row in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5e31904..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
> Plans 001 and 002 are expected to modify other regions of these files. Confirm that the circumference calculations quoted below are unchanged. Stop if their inputs or return fields have changed.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-render-live-energy-without-window.md`, `plans/002-repair-template-subscription-lifecycle.md`
- **Category**: bug
- **Planned at**: commit `5e31904`, 2026-07-25

## Why this matters

When grid, solar, and battery contributions to home are all zero, both flow cards divide the grid remainder by `totalHomeConsumption`, which is zero. The resulting `NaN` is interpolated into SVG `stroke-dasharray`, breaking the home ring during idle, unavailable, or tolerance-zeroed states. Every circumference should be finite, and all segments should be zero when there is no home consumption.

## Current state

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts:829-850` computes power-mode home-ring segments.
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:1020-1041` duplicates the calculation for energy mode.
- `packages/shared/src/components/home.ts:125-135` writes `homeGridCircumference` into SVG attributes. That shared renderer is not faulty and is out of scope.
- Both card packages have direct `_computeRenderData` tests for unavailable entities but do not assert circumference fields.

Current power-card calculation:

```ts
const totalHomeConsumption = Math.max(
  (grid.state.toHome ?? 0) + (solar.state.toHome ?? 0) + (battery.state.toHome ?? 0),
  0
);
const homeBatteryCircumference = battery.state.toHome
  ? CIRCLE_CIRCUMFERENCE * (battery.state.toHome / totalHomeConsumption)
  : 0;
const homeSolarCircumference = solar.state.toHome
  ? CIRCLE_CIRCUMFERENCE * (solar.state.toHome / totalHomeConsumption)
  : 0;
const homeNonFossilCircumference = nonFossil.state.power
  ? CIRCLE_CIRCUMFERENCE * (nonFossil.state.power / totalHomeConsumption)
  : 0;
const homeGridCircumference =
  CIRCLE_CIRCUMFERENCE *
  ((totalHomeConsumption -
    (nonFossil.state.power ?? 0) -
    (battery.state.toHome ?? 0) -
    (solar.state.toHome ?? 0)) /
    totalHomeConsumption);
```

The energy card uses the same shape. The first three segments rely on a truthy numerator, but the grid segment always divides. Use one explicit positive-total guard consistently for all four segments.

The existing unavailable-state tests are:

- Power: `power-flow-card-plus/__tests__/render.test.ts:178-196`
- Energy: `energy-flow-card-plus/__tests__/render.test.ts:177-201`

Extend their test-only `_computeRenderData` return types to expose the four circumference fields instead of using a broad cast.

## Commands you will need

| Purpose      | Command                                                                                               | Expected on success |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------- |
| Power tests  | `pnpm --filter power-flow-card-plus test`                                                             | exit 0              |
| Energy tests | `pnpm --filter energy-flow-card-plus test`                                                            | exit 0              |
| Typecheck    | `pnpm --filter power-flow-card-plus typecheck && pnpm --filter energy-flow-card-plus typecheck`       | exit 0              |
| Lint         | `pnpm --filter power-flow-card-plus lint && pnpm --filter energy-flow-card-plus lint`                 | exit 0              |
| Format check | `pnpm --filter power-flow-card-plus format:check && pnpm --filter energy-flow-card-plus format:check` | exit 0              |

## Scope

**In scope**:

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts`
- `packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts`
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
- `plans/README.md`, status row only

**Out of scope**:

- `packages/shared/src/components/home.ts`
- Flow distribution and tolerance algorithms
- SVG styling or ring layout
- Clamping nonzero segment totals or redesigning non-fossil allocation
- New dependencies

## Git workflow

- Branch: `advisor/003-guard-zero-home-circumference`
- Commit message: `fix: guard zero home circumference totals`
- Keep the power and energy fixes in the same logical commit
- Do not push or open a PR unless the operator instructs it
- Do not add code comments

## Steps

### Step 1: Expand no-NaN regression assertions

In both `__tests__/render.test.ts` files:

1. Add `homeBatteryCircumference`, `homeSolarCircumference`, `homeNonFossilCircumference`, and `homeGridCircumference` to the test-only return type for `_computeRenderData`.
2. In the existing unavailable-entity/no-NaN case, assert `Number.isFinite` for all four fields.
3. Assert that all four equal `0` when all contributing flows are zero.

Do not replace the current entity-state assertions; add the circumference checks to them.

**Verify**: Both focused suites must fail specifically because `homeGridCircumference` is not finite before the production fix.

### Step 2: Guard every circumference with the positive total

In each card's `_computeRenderData`:

1. Derive `hasHomeConsumption` as `totalHomeConsumption > 0`.
2. Require `hasHomeConsumption` in the conditions for battery, solar, and non-fossil circumference calculations.
3. Calculate grid circumference only when `hasHomeConsumption` is true; otherwise return `0`.
4. Preserve the existing nonzero formulas exactly.

The target behavior is:

```ts
const hasHomeConsumption = totalHomeConsumption > 0;
const homeGridCircumference = hasHomeConsumption
  ? CIRCLE_CIRCUMFERENCE * (remainder / totalHomeConsumption)
  : 0;
```

Use the existing inline remainder expression unless extracting it materially improves readability. Do not introduce an epsilon because the bug is an exact zero denominator, not floating-point comparison.

**Verify**: Both focused test suites exit 0, and the new tests assert finite zero circumferences.

### Step 3: Run package gates

**Verify**:

- Both package typechecks exit 0
- Both package lints exit 0
- Both package format checks exit 0
- `rg "homeGridCircumference =" packages/flixlix-cards/*/src` shows both guarded assignments
- `git diff --name-only` contains only the four in-scope implementation/test files and `plans/README.md` if updated

## Test plan

- Power idle state: all circumference fields are finite and zero.
- Energy idle state: all circumference fields are finite and zero.
- Existing nonzero distribution tests continue to prove state calculations are unchanged.
- Structural pattern: extend the existing unavailable/no-NaN tests rather than creating a separate harness.
- Verification: each package suite passes with four new circumference assertions.

## Done criteria

- [ ] No circumference divides by a zero `totalHomeConsumption`
- [ ] All four power-card circumference fields are zero in the idle fixture
- [ ] All four energy-card circumference fields are zero in the idle fixture
- [ ] Both focused test suites exit 0
- [ ] Both package typechecks exit 0
- [ ] Both package lints exit 0
- [ ] Both package format checks exit 0
- [ ] No shared renderer or distribution code is modified
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report if:

- `totalHomeConsumption` can be negative after the existing `Math.max` guard.
- A non-finite circumference remains after applying the positive-total guard.
- Correct behavior requires changing distribution math or the shared home SVG renderer.
- The nonzero fixtures change their state-distribution results.
- Any verification fails twice after a reasonable correction.

## Maintenance notes

- Reviewers should verify that nonzero formulas remain byte-for-byte equivalent apart from their guard.
- Any future home source must be included in both `totalHomeConsumption` and the ring remainder consistently.
- Keep the power and energy regression assertions parallel until the duplicated controllers are consolidated.
