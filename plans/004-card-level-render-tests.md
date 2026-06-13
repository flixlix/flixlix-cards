# Plan 004: Replace smoke-only card render tests with real `_computeRenderData` assertions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/flixlix-cards/power-flow-card-plus/__tests__/ packages/flixlix-cards/energy-flow-card-plus/__tests__/ packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-fix-negative-flow-tolerance.md (one test case asserts the fixed behavior)
- **Category**: tests
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

The shared calculation utilities have a real test suite, but the per-card integration layer — config + `hass` states in, render data out — is guarded only by smoke tests. The entire power-flow test asserts that `render()` returns *something truthy*. A regression anywhere in the ~500-line `_computeRenderData()` (entity resolution, tolerance application, grid/solar/battery splits) would pass CI. These cards re-render on every Home Assistant state update; this is the code the repo exists for. Real tests here are also the prerequisite for the riskier Plans 005 (render guard) and 007 (editor dedup).

## Current state

- The smoke test, in full — `packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts:9-23`:

```ts
test("renders correctly", () => {
  const config = {
    type: "custom:power-flow-card-plus",
    entities: {
      grid: { entity: "sensor.grid" },
      solar: { entity: "sensor.solar" },
      battery: { entity: "sensor.battery" },
    },
  } as PowerFlowCardPlusConfig;
  const card = new PowerFlowCardPlus();
  card.setConfig(config);
  card.connectedCallback();
  const rendered = (card as unknown as { render: () => unknown }).render();
  expect(rendered).toBeTruthy();
});
```

Note it never sets `card.hass` — entity states play no role.

- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts` has the same shape (empty/no states; the energy-collection refresh path `_refreshEnergyData` is never exercised).
- The target method: `power-flow-card-plus.ts:554` `private _computeRenderData()` — builds `grid`, `solar`, `battery`, `home`, `nonFossil`, individual field objects; applies `adjustZeroTolerance` at lines 762-785; zeroes dependent flows at lines 791-799 (e.g. `if (grid.state.fromGrid === 0) { grid.state.toHome = 0; ... }`). It is `private` — tests access it via cast, same trick the smoke test uses for `render`.
- `willUpdate` at `power-flow-card-plus.ts:534-552` recomputes `_renderData` when `hass`/`_config`/`_templateResults`/`_width` change — after setting `hass` and `_config`, calling `(card as any)._computeRenderData()` directly is the simplest stable seam.
- **In-repo exemplar for rich card tests with a mock hass**: `packages/flixlix-cards/sortable-list-card/__tests__/render.test.ts:15-31` — its `makeHass()` helper:

```ts
function makeHass(stateValue = "", callService = vi.fn()) {
  return {
    localize: (key: string) => key,
    locale: { language: "en", number_format: "comma_decimal" },
    states: {
      "input_text.order": { state: stateValue, attributes: { friendly_name: "Order" } },
      ...
    },
    callService,
    config: {},
  } as any;
}
```

Model the new helpers on this. Tests run under vitest (config via `@flixlix-cards/testing` / `vitest-base.js`, jsdom available).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Power-flow tests | `pnpm --filter power-flow-card-plus test` | all pass |
| Energy-flow tests | `pnpm --filter energy-flow-card-plus test` | all pass |
| All tests | `pnpm test` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts` (extend — keep the existing smoke test)
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts` (extend)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Any file under `src/` in any package — this plan adds tests only. If a test exposes a real bug, see STOP conditions.
- `packages/shared/__tests__/` — shared-level coverage already exists; card-level integration is the gap.
- `energy-breakdown-card` / `sortable-list-card` tests — already substantive.

## Git workflow

- Branch: `advisor/004-card-render-tests`
- Commit style: `test: :white_check_mark: assert renderData computation in flow cards`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the target before writing

Read `power-flow-card-plus.ts` lines 554-810 end to end and note the exact shape returned by `_computeRenderData()` (which fields exist on `grid.state`, `solar.state`, `battery.state`). Do the same for the energy card's `_computeRenderData` (`energy-flow-card-plus.ts:724`). Do not guess field names.

**Verify**: you can list the returned top-level keys for both cards in your report.

### Step 2: Power-flow `_computeRenderData` tests

In the power-flow `render.test.ts`, add a `makeHass(states: Record<string, string>)` helper (modeled on the sortable-list exemplar) and a `makeCard(config, hass)` helper that does `new PowerFlowCardPlus()`, `setConfig`, sets `.hass`, then returns `(card as any)`. Add a `describe("_computeRenderData")` block with at least these cases (numeric expectations computed from the states you set — derive them from the code you read in Step 1):

1. **Grid-only consumption**: grid entity state `"500"`, no solar/battery → `grid.state.fromGrid` is 500, solar/battery absent or zeroed.
2. **Solar covers home + export**: solar `"1000"`, grid production present → `solar.state.total` is 1000 and the line-791 dependency rule holds (`fromGrid === 0` forces `grid.state.toHome === 0`).
3. **Tolerance zeroing**: grid `"3"` with `entities.grid.display_zero_tolerance: 5` → `grid.state.fromGrid === 0`.
4. **Negative individual stays visible** (regression for Plan 001): one `entities.individual` entry whose entity state is `"-50"`, `display_zero` unset → the corresponding individual object has `has === true` and `state === -50`.
5. **Unavailable entity**: grid entity state `"unavailable"` → no `NaN` anywhere in `grid.state` (assert with `Number.isNaN` checks on each numeric field).

**Verify**: `pnpm --filter power-flow-card-plus test` → all pass.

### Step 3: Energy-flow `_computeRenderData` tests

Same pattern for `EnergyFlowCardPlus`, acknowledging its data comes from energy collections: set whatever instance state the method reads (discover in Step 1 — e.g. growth/collection maps) directly on the cast card instance. Minimum cases: (1) basic grid+solar split with known totals; (2) tolerance zeroing via `adjustZeroTolerance` call sites at `energy-flow-card-plus.ts:953-975`; (3) no-`NaN` guarantee with an empty/missing collection.

**Verify**: `pnpm --filter energy-flow-card-plus test` → all pass.

### Step 4: Full run

**Verify**: `pnpm test` and `pnpm typecheck` → exit 0.

## Test plan

This plan *is* the test plan — Steps 2-3 enumerate the cases. Keep assertions on **data**, not on rendered HTML strings (template output is too brittle). Expected new tests: ≥8 across the two cards.

## Done criteria

- [ ] `pnpm test` exits 0 with ≥8 new named tests across the two flow-card `render.test.ts` files
- [ ] At least one test asserts the negative-individual regression (Plan 001 behavior)
- [ ] At least one test asserts NaN-free output for `"unavailable"` state
- [ ] No `src/` file modified (`git status` shows only the two test files + plans/README.md)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not yet merged (check `plans/README.md` and `packages/shared/src/states/tolerance/base.ts` for `Math.abs`) — case 4 of Step 2 would fail for the wrong reason.
- A test reveals a genuine bug in `_computeRenderData` (your computed expectation disagrees with the code's output and the code is wrong) — do NOT change `src/`; report the discrepancy with numbers.
- `_computeRenderData` requires DOM/`connectedCallback` side effects that make direct invocation impossible — report what it needs instead of mocking the world.

## Maintenance notes

- These tests pin the renderData contract; Plan 005 (render guard) and Plan 007 (editor dedup) rely on them as their safety net — land this first.
- When a new entity type is added to a card, add a renderData case here in the same PR.
- Deferred: jsdom-mounted shadow-DOM assertions (SVG flows present/absent) — higher fidelity, much higher brittleness; revisit only if data-level tests prove insufficient.
