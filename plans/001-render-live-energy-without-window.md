# Plan 001: Render live energy values without an energy-period window

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update this plan's status row in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5e31904..HEAD -- packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
> If either in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code. If a quoted condition or method no longer matches, stop and report.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `5e31904`, 2026-07-25

## Why this matters

`energy_date_selection: false` is documented and implemented as a mode that reads current entity values instead of period statistics. The card nevertheless refuses to render unless Home Assistant exposes an energy-period window, so this mode permanently shows "no data" on ordinary Lovelace views. The fix must allow live mode to render after its data initialization completes while preserving the loading and no-data states for period-synchronized mode.

## Current state

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` owns period refresh, rendering, and live-versus-period state selection.
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts` is the existing jsdom regression suite and already uses `energy_date_selection: false` for direct state calculations.

At `energy-flow-card-plus.ts:296-306`, a missing period is treated as a completed refresh:

```ts
const window = getGlobalEnergyPeriodWindow(this.hass, this._energyCollectionKey);
this._energyWindow = window;
const statisticIds = this._collectStatisticIds();
const zeroGrowthMap = Object.fromEntries(statisticIds.map((id) => [id, 0]));

if (!window) {
  this._energyGrowthMap = zeroGrowthMap;
  this._energyDataLoaded = true;
  return;
}
```

At `energy-flow-card-plus.ts:499-510`, rendering still requires the window unconditionally:

```ts
if (!this._energyWindow || !this._energyDataLoaded) {
  return html`<ha-card .header=${this._config.title}>
    <div class="card-content">
      ${this._energyWindow
        ? this.hass.localize("ui.panel.lovelace.cards.energy.loading")
        : this.hass.localize("ui.panel.lovelace.cards.energy.no_data")}
    </div>
  </ha-card>`;
}
```

At `energy-flow-card-plus.ts:723-729`, direct entity values are already selected correctly:

```ts
const { entities, energy_date_selection } = this._config;
const useDateSelection = energy_date_selection !== false;
const getEnergyEntityStateLocal = (entity?: string): number => {
  return getEnergyEntityState(this.hass, this._energyGrowthMap, useDateSelection, entity);
};
```

Preserve the existing Lit conventions and test style in `__tests__/render.test.ts`: instantiate the card, assign `hass`, call `setConfig`, mount only when DOM rendering is needed, and use private state through a narrow test-only cast.

## Commands you will need

| Purpose       | Command                                            | Expected on success                |
| ------------- | -------------------------------------------------- | ---------------------------------- |
| Focused tests | `pnpm --filter energy-flow-card-plus test`         | exit 0; all energy-card tests pass |
| Typecheck     | `pnpm --filter energy-flow-card-plus typecheck`    | exit 0; no TypeScript errors       |
| Lint          | `pnpm --filter energy-flow-card-plus lint`         | exit 0; no lint errors             |
| Format check  | `pnpm --filter energy-flow-card-plus format:check` | exit 0                             |

## Scope

**In scope**:

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
- `plans/README.md`, status row only

**Out of scope**:

- Energy-period discovery, listener patching, and statistics requests in `packages/shared/src/states/utils/energy-period.ts`
- Changes to `energy_date_selection` defaults, schema, or documentation
- Power Flow Card Plus
- Refactoring `_computeRenderData`
- New dependencies

## Git workflow

- Branch: `advisor/001-render-live-energy-without-window`
- Commit this as one logical change with message `fix: render live energy values without period`
- Do not push or open a PR unless the operator instructs it
- Do not add code comments

## Steps

### Step 1: Add regression coverage for both rendering modes

Extend the `render` describe block in `energy-flow-card-plus/__tests__/render.test.ts`.

Import `render` from `lit` as `renderTemplate`. For each new case, call the card's protected `render()` through the existing test-only cast, pass the resulting `TemplateResult` to `renderTemplate` with a detached `document.createElement("div")`, and inspect that detached host's `textContent`. Do not append the card itself; connecting it starts `_refreshEnergyData` and would overwrite the private state under test.

Add a regression test for live mode:

1. Create a fresh `EnergyFlowCardPlus`.
2. Assign `hass = makeHass({ "sensor.grid_energy": "300" })`.
3. Call `setConfig` with `energy_date_selection: false` and `entities.grid.entity = "sensor.grid_energy"`.
4. Set `_energyWindow` to `null` and `_energyDataLoaded` to `true` through a test-only cast, matching the completed no-window state produced by `_doRefreshEnergyData`.
5. Render the card's returned template into the detached host.
6. Assert that `ui.panel.lovelace.cards.energy.no_data` and `ui.panel.lovelace.cards.energy.loading` are both absent. The existing direct `_computeRenderData` test at lines 129-156 already verifies that the same fixture resolves the live value `300`.

Add a second test for the default synchronized mode:

1. Use the same construction order: assign `hass`, call `setConfig`, then set private test state.
2. Omit `energy_date_selection`.
3. Set `_energyWindow` to `null` and `_energyDataLoaded` to `true`.
4. Render into a fresh detached host and assert that `ui.panel.lovelace.cards.energy.no_data` remains present.

Add a third test for incomplete live-mode initialization:

1. Configure `energy_date_selection: false` after assigning `hass`.
2. Set `_energyWindow` to `null` and `_energyDataLoaded` to `false`.
3. Render into a fresh detached host without invoking `connectedCallback`.
4. Assert that `ui.panel.lovelace.cards.energy.loading` is present and `ui.panel.lovelace.cards.energy.no_data` is absent.

Do not weaken the existing "renders while energy stats are unresolved" assertion.

**Verify**: `pnpm --filter energy-flow-card-plus test` must fail on the new live-mode assertion and keep the synchronized-mode assertion passing before the production fix.

### Step 2: Make the period window conditional on the selected mode

In `render()`, derive two booleans before the placeholder branch:

- `requiresEnergyWindow`: `true` unless `this._config.energy_date_selection === false`
- `missingRequiredWindow`: `requiresEnergyWindow && !this._energyWindow`

Enter the placeholder branch only when `!this._energyDataLoaded || missingRequiredWindow`.

Choose the placeholder text from the actual state:

- `no_data` when `missingRequiredWindow` is true
- `loading` when data initialization is incomplete but live mode does not require a window

Do not change `_doRefreshEnergyData`; its existing no-window path correctly marks initialization complete and supplies a zero growth map.

**Verify**: `pnpm --filter energy-flow-card-plus test` exits 0 and all three new rendering-state tests pass.

### Step 3: Run package gates

Run the package checks without formatting source automatically.

**Verify**:

- `pnpm --filter energy-flow-card-plus typecheck` exits 0
- `pnpm --filter energy-flow-card-plus lint` exits 0
- `pnpm --filter energy-flow-card-plus format:check` exits 0
- `git diff --name-only` lists only the two in-scope implementation/test files and `plans/README.md` if its status was updated

## Test plan

- Regression: live mode with no period window renders current entity data.
- Compatibility: synchronized mode with no period window still renders the no-data state.
- Loading state: incomplete live-mode initialization reports loading rather than no data.
- Structural pattern: follow the existing card construction and jsdom setup in `energy-flow-card-plus/__tests__/render.test.ts:76-127`.
- Verification: `pnpm --filter energy-flow-card-plus test` passes with three tests covering live, synchronized, and incomplete initialization states.

## Done criteria

- [ ] `energy_date_selection: false` does not require `_energyWindow`
- [ ] Default synchronized mode still requires `_energyWindow`
- [ ] Incomplete live-mode initialization reports loading, not no data
- [ ] `pnpm --filter energy-flow-card-plus test` exits 0
- [ ] `pnpm --filter energy-flow-card-plus typecheck` exits 0
- [ ] `pnpm --filter energy-flow-card-plus lint` exits 0
- [ ] `pnpm --filter energy-flow-card-plus format:check` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report if:

- `getEnergyEntityState` no longer uses `energy_date_selection` to choose live values.
- A missing period no longer produces `_energyDataLoaded = true`.
- Rendering live values requires modifying shared energy-period discovery or statistics code.
- The synchronized-mode regression starts rendering live states without a period.
- Any verification fails twice after a reasonable correction.

## Maintenance notes

- Reviewers should verify the distinction between "window required" and "data initialized"; combining them again recreates the bug.
- Future changes to the placeholder UI must keep live mode's loading state distinct from synchronized mode's no-data state.
- Energy-period listener and statistics coverage remains a separate test-coverage finding.
