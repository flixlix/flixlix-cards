# Plan 004: Honor the configured energy flow-rate model

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update this plan's status row in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5e31904..HEAD -- packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
> Plans 001-003 are expected to modify other portions of these files. Plan 002 may add subscription-refresh statements later in `setConfig`; that expected addition is not blocking drift. Confirm that the normalized `_config` assignment quoted below remains unchanged. Stop if that assignment has moved or been redesigned.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/003-guard-zero-home-circumference.md`
- **Category**: bug
- **Planned at**: commit `5e31904`, 2026-07-25

## Why this matters

Energy Flow Card Plus exposes and documents `use_new_flow_rate_model`, and its shared flow-rate function supports both algorithms. `setConfig` currently overwrites every supplied value with `false`, so users cannot enable the documented model. The fix must preserve explicit `true` and `false` values while retaining the energy card's documented default of `false`.

## Current state

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:150-185` normalizes incoming configuration.
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts:76-127` contains basic `setConfig` tests.
- `packages/shared/src/types/config.ts:22` declares `use_new_flow_rate_model?: boolean`.
- `packages/shared/src/utils/compute-flow-rate.ts:35` reads `config.use_new_flow_rate_model`.
- `packages/flixlix-cards/energy-flow-card-plus/README.md:139,508` documents setting the option to `true`.

The current spread is immediately overwritten:

```ts
this._config = {
  ...config,
  min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
  max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
  base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
  kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
  kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
  mega_threshold: coerceNumber(config.mega_threshold, defaultValues.megaThreshold),
  max_expected_power: coerceNumber(config.max_expected_power, defaultValues.maxExpectedPower),
  min_expected_power: coerceNumber(config.min_expected_power, defaultValues.minExpectedPower),
  use_new_flow_rate_model: false,
  display_zero_lines: {
```

Do not adopt the shared default of `true` from `getDefaultConfig`; the energy card README currently states a `false` default. This plan fixes explicit-value preservation only.

## Commands you will need

| Purpose      | Command                                            | Expected on success |
| ------------ | -------------------------------------------------- | ------------------- |
| Tests        | `pnpm --filter energy-flow-card-plus test`         | exit 0              |
| Typecheck    | `pnpm --filter energy-flow-card-plus typecheck`    | exit 0              |
| Lint         | `pnpm --filter energy-flow-card-plus lint`         | exit 0              |
| Format check | `pnpm --filter energy-flow-card-plus format:check` | exit 0              |

## Scope

**In scope**:

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
- `plans/README.md`, status row only

**Out of scope**:

- Power Flow Card Plus
- `computeFlowRate` formulas
- Shared defaults in `getDefaultConfig`
- UI editor schema or documentation
- Changing the energy card's default from `false`
- New dependencies

## Git workflow

- Branch: `advisor/004-preserve-energy-flow-rate-model`
- Commit message: `fix: honor energy flow rate model setting`
- Do not push or open a PR unless the operator instructs it
- Do not add code comments

## Steps

### Step 1: Add configuration normalization tests

In the existing `render` describe block of `energy-flow-card-plus/__tests__/render.test.ts`, add three `setConfig` assertions:

1. `use_new_flow_rate_model: true` produces `_config.use_new_flow_rate_model === true`.
2. `use_new_flow_rate_model: false` produces `_config.use_new_flow_rate_model === false`.
3. Omitting the property produces `_config.use_new_flow_rate_model === false`.

Use a minimal valid grid entity in each configuration. Access `_config` through a narrow test-only cast, matching the existing `collection_key` test.

**Verify**: `pnpm --filter energy-flow-card-plus test` fails only the explicit-true case before the production fix.

### Step 2: Preserve explicit booleans and retain the default

Change the normalized assignment to:

```ts
use_new_flow_rate_model: config.use_new_flow_rate_model ?? false,
```

Use nullish coalescing, not `||`, so an explicit `false` remains false. Do not remove the normalized property because the energy card requires a different default from the shared helper's fallback.

**Verify**: `pnpm --filter energy-flow-card-plus test` exits 0 and all three normalization cases pass.

### Step 3: Run package gates

**Verify**:

- `pnpm --filter energy-flow-card-plus typecheck` exits 0
- `pnpm --filter energy-flow-card-plus lint` exits 0
- `pnpm --filter energy-flow-card-plus format:check` exits 0
- `rg "use_new_flow_rate_model: config.use_new_flow_rate_model \\?\\? false" packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` returns one match
- `git diff --name-only` contains only the two in-scope implementation/test files and `plans/README.md` if updated

## Test plan

- Explicit enabled value is retained.
- Explicit disabled value is retained.
- Missing value defaults to disabled.
- Existing calculation and render tests continue to pass.
- Structural pattern: add assertions beside the existing `collection_key` normalization test.
- Verification: `pnpm --filter energy-flow-card-plus test` passes with three new configuration cases.

## Done criteria

- [ ] Explicit `true` survives `setConfig`
- [ ] Explicit `false` survives `setConfig`
- [ ] Omitted option normalizes to `false`
- [ ] `pnpm --filter energy-flow-card-plus test` exits 0
- [ ] `pnpm --filter energy-flow-card-plus typecheck` exits 0
- [ ] `pnpm --filter energy-flow-card-plus lint` exits 0
- [ ] `pnpm --filter energy-flow-card-plus format:check` exits 0
- [ ] No shared defaults, formulas, schema, or docs are modified
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report if:

- Current documentation no longer states that the energy-card default is `false`.
- `use_new_flow_rate_model` has been removed from the shared config type or flow calculation.
- Preserving `true` causes existing flow-rate tests to fail because the energy card intentionally forbids the model.
- Any verification fails twice after a reasonable correction.

## Maintenance notes

- Reviewers should reject `|| false`; only `?? false` preserves the full boolean contract.
- If the default is intentionally changed later, update configuration normalization, UI defaults, and both README/documentation surfaces together.
- Formula correctness remains owned by the shared `compute-flow-rate` tests.
