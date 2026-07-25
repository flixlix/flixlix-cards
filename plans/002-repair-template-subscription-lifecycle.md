# Plan 002: Make template subscriptions reactive and fully disposable

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update this plan's status row in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5e31904..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
> Plan 001 is expected to change the energy card's render placeholder and tests. That change does not overlap the subscription methods quoted below. Stop if the subscription methods, `setConfig`, or `_templateResults` callback no longer match.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-render-live-energy-without-window.md`
- **Category**: bug
- **Planned at**: commit `5e31904`, 2026-07-25

## Why this matters

Both flow cards subscribe to Home Assistant render-template topics. Individual templates are registered under position-specific keys, and the non-fossil template has its own key, but teardown looks up different or incomplete keys. Those subscriptions survive card removal, while configuration edits retain old templates. Callback results also mutate a Lit `@state` object in place, so a template update may not render until an unrelated Home Assistant state update occurs.

## Current state

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts` contains the power card's template subscription map at lines 1064-1171.
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` duplicates the same lifecycle at lines 1261-1368.
- Each package's `__tests__/render.test.ts` is its existing jsdom card regression suite.

Power-card connection assigns position-specific topics:

```ts
const templatesObj = {
  gridSecondary: entities.grid?.secondary_info?.template,
  solarSecondary: entities.solar?.secondary_info?.template,
  homeSecondary: entities.home?.secondary_info?.template,
  individualSecondary: entities.individual?.map(
    (individual) => individual.secondary_info?.template
  ),
  nonFossilFuelSecondary: entities.fossil_fuel_percentage?.secondary_info?.template,
};

const individualKeys = ["left-top", "left-bottom", "right-top", "right-bottom"];
value.forEach((template, index) => {
  if (template) this._tryConnect(template, `${individualKeys[index]}Secondary`);
});
```

Power-card teardown omits `nonFossilFuelSecondary` and asks for the nonexistent `individualSecondary` topic:

```ts
const templatesObj = {
  gridSecondary: entities.grid?.secondary_info?.template,
  solarSecondary: entities.solar?.secondary_info?.template,
  homeSecondary: entities.home?.secondary_info?.template,
  individualSecondary: entities.individual?.map(
    (individual) => individual.secondary_info?.template
  ),
};

for (const [key, value] of Object.entries(templatesObj)) {
  if (value) {
    this._tryDisconnect(key);
  }
}
```

The energy card has the same mismatch at `energy-flow-card-plus.ts:1261-1349`.

Both callbacks mutate the reactive object without assigning a new reference:

```ts
(result) => {
  this._templateResults[topic] = result;
};
```

Both `setConfig` implementations replace `_config` without refreshing template subscriptions. `_tryConnect` then refuses an existing topic because `_unsubRenderTemplates` still contains it.

The repository's Vitest module-mocking pattern uses hoisted `vi.mock`, as demonstrated by each flow card's `__tests__/ui-editor.test.ts`. Follow that pattern for `subscribeRenderTemplate`.

## Commands you will need

| Purpose      | Command                                                                                               | Expected on success                |
| ------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Power tests  | `pnpm --filter power-flow-card-plus test`                                                             | exit 0; all power-card tests pass  |
| Energy tests | `pnpm --filter energy-flow-card-plus test`                                                            | exit 0; all energy-card tests pass |
| Typecheck    | `pnpm --filter power-flow-card-plus typecheck && pnpm --filter energy-flow-card-plus typecheck`       | exit 0                             |
| Lint         | `pnpm --filter power-flow-card-plus lint && pnpm --filter energy-flow-card-plus lint`                 | exit 0                             |
| Format check | `pnpm --filter power-flow-card-plus format:check && pnpm --filter energy-flow-card-plus format:check` | exit 0                             |

## Scope

**In scope**:

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts`
- `packages/flixlix-cards/power-flow-card-plus/__tests__/render.test.ts`
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
- `packages/flixlix-cards/energy-flow-card-plus/__tests__/render.test.ts`
- `plans/README.md`, status row only

**Out of scope**:

- Template parsing or server-side Home Assistant behavior
- Template topic limits beyond the four positions currently supported
- PR #306's separate individual-device cap work
- Extracting a shared base class or subscription controller
- Energy-period and fossil-data subscriptions
- New dependencies

## Git workflow

- Branch: `advisor/002-repair-template-subscription-lifecycle`
- Use one commit for tests and one for the production fix if the operator wants step-level commits; otherwise use one logical commit
- Commit message: `fix: clean up flow card template subscriptions`
- Do not push or open a PR unless the operator instructs it
- Do not add code comments

## Steps

### Step 1: Add deterministic subscription mocks

In each card's `__tests__/render.test.ts`:

1. Change the Vitest import to include `beforeEach`, `describe`, `expect`, `test`, and `vi`; use `vi.waitFor` for asynchronous assertions.
2. Use `vi.hoisted` to create the `subscribeRenderTemplate` mock and shared capture arrays.
3. Declare the partial `vi.mock` for `@flixlix-cards/shared/ha/template/ha-websocket`, preserving its other exports and replacing only `subscribeRenderTemplate`.
4. Import `RenderTemplateResult` as a type from the mocked module.
5. Move the card-class import below the `vi.hoisted` and `vi.mock` declarations.
6. Have each mock call create a distinct record containing its options, callback, unsubscribe spy, and `active: true`; increment an `activeSubscriptions` counter.
7. Return `Promise.resolve` of a guarded function that changes that record to `active: false`, decrements the counter once, and calls the spy. A repeated unsubscribe call must not decrement twice.
8. Capture records so tests can deliver a synthetic result, identify template strings, and assert which subscription remains active.
9. Reset all spies, counters, and captured records before each test.

Use `vi.waitFor` for observable completion instead of an unspecified promise flush:

- After connecting, wait until `subscribeRenderTemplate` reaches the expected call count.
- After disconnecting, wait until every unsubscribe spy has one call and `activeSubscriptions` is zero.
- After replacing config, wait until a call's options contain the new template and the old unsubscribe spy has one call.

Do not mock `_tryConnectAll` or `_tryDisconnectAll`; the tests must exercise the real topic map and lifecycle.

**Verify**: Run each package test command. Existing tests must continue to pass before adding failing lifecycle assertions.

### Step 2: Add regression cases for teardown, config replacement, and reactivity

Add equivalent tests for both flow cards:

1. Create a fresh card and assign `hass = makeHass()`.
2. Call `setConfig` with the required grid entity plus secondary templates for grid, one individual device, and non-fossil percentage.
3. Append the card to `document.body`, await `updateComplete`, and use `vi.waitFor` until the expected three subscriptions exist.
4. Remove the card from the DOM so the platform invokes `disconnectedCallback`.
5. Use `vi.waitFor` until every returned unsubscribe function ran exactly once and `activeSubscriptions === 0`.
6. Assert the subscription count equals the unsubscribe count; this must fail against the current mismatched teardown.
7. Use `finally` to remove the card if it is still connected.

Add a connected configuration-replacement test:

1. Create a fresh card, assign `hass = makeHass()`, and call `setConfig` with a required grid entity whose secondary template contains a unique old string.
2. Append the card, await `updateComplete`, and wait for the old subscription record.
3. Call `setConfig` with the same entity but a unique new template string.
4. Await `updateComplete`, then use `vi.waitFor` until the old unsubscribe ran and a subscription record contains the new template.
5. Assert no active record contains the old template, `activeSubscriptions === 1`, and exactly one active record contains the new template.
6. Remove the card and wait for `activeSubscriptions === 0`.

Add a callback reactivity test:

1. Create a fresh card, assign `hass = makeHass()`, and call `setConfig` with a required grid entity and one grid secondary template.
2. Append the card, await `updateComplete`, and use `vi.waitFor` until one subscription record exists.
3. Save the current `_templateResults` reference.
4. Invoke that record's callback with a valid `RenderTemplateResult`.
5. Assert `_templateResults` contains `gridSecondary` and is not the old object reference.
6. Remove the card and wait for `activeSubscriptions === 0`.

**Verify**: Both package test commands must fail on the new assertions before the production fix.

### Step 3: Make callback updates immutable

In both `_tryConnect` implementations, replace the indexed mutation with a new object assignment:

```ts
this._templateResults = {
  ...this._templateResults,
  [topic]: result,
};
```

This is the same immutable assignment pattern already used by each method's error path.

**Verify**: The callback reactivity tests pass in both packages. Teardown and replacement tests may still fail until Step 4.

### Step 4: Disconnect from the subscription map, not current configuration

In both cards:

1. Change `_tryDisconnectAll` to enumerate a snapshot of `_unsubRenderTemplates.keys()`.
2. Await every `_tryDisconnect(topic)` operation with `Promise.all`.
3. Do not reconstruct topics from `_config`; the map is the authoritative list and includes removed templates, individual position topics, and non-fossil topics.
4. Preserve `_tryDisconnect`'s existing handling for closed connections.

Use a snapshot such as `[...this._unsubRenderTemplates.keys()]` so deleting map entries during teardown cannot skip topics.

**Verify**: The disconnect tests pass and assert equal subscribe/unsubscribe counts for both cards.

### Step 5: Refresh subscriptions after connected config changes

In both cards:

1. Add a private async helper that awaits `_tryDisconnectAll`, clears `_templateResults`, and then calls `_tryConnectAll` only if `this.isConnected`.
2. In `setConfig`, determine whether the element is already connected before or immediately after assigning the normalized new config.
3. If connected, invoke the helper without making `setConfig` asynchronous.
4. Keep initial connection behavior in `connectedCallback`.
5. Keep `_tryConnectAll` in `updated`; it may observe old topics during the refresh, but the async helper must reconnect after teardown and become the final state.

Do not compare only the new configuration when disconnecting: removed templates must also be unsubscribed.

**Verify**: The connected configuration-replacement tests pass for both cards, the latest subscription receives the new template string, and `activeSubscriptions` is exactly one before removal and zero afterward. This is the race regression gate for `updated()` versus the async refresh helper.

### Step 6: Run all package gates

**Verify**:

- Both focused test commands exit 0
- Both typecheck commands exit 0
- Both lint commands exit 0
- Both format-check commands exit 0
- `git diff --name-only` contains only the four implementation/test files and `plans/README.md` if updated

## Test plan

- Individual-position teardown: position-specific topics unsubscribe.
- Non-fossil teardown: `nonFossilFuelSecondary` unsubscribes.
- Count invariant: every successful subscription is paired with exactly one unsubscribe.
- Configuration replacement: old template unsubscribes and new template subscribes while mounted.
- Reactivity: callback assignment creates a new `_templateResults` reference.
- Structural pattern: use the hoisted module mocks in each package's `__tests__/ui-editor.test.ts`.
- Verification: both package test suites pass with equivalent lifecycle cases.

## Done criteria

- [ ] Teardown iterates actual map keys
- [ ] Individual and non-fossil subscriptions are disposed
- [ ] Connected `setConfig` replaces old subscriptions
- [ ] Callback results update `_templateResults` immutably
- [ ] Subscription and unsubscribe counts match in both card suites
- [ ] Both package test suites exit 0
- [ ] Both package typechecks exit 0
- [ ] Both package lints exit 0
- [ ] Both package format checks exit 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report if:

- PR #306 or another change has replaced the individual topic mapping.
- `subscribeRenderTemplate` no longer returns a promise of an unsubscribe function.
- Correct cleanup requires changing shared Home Assistant websocket helpers.
- Configuration replacement causes duplicate active subscriptions after two reasonable race-order fixes.
- A test requires real Home Assistant network access.
- Any verification fails twice after a reasonable correction.

## Maintenance notes

- The subscription map must remain the teardown source of truth. Rebuilding teardown topics from current configuration recreates leaks when templates are removed.
- Reviewers should scrutinize async ordering between `updated`, config replacement, and unsubscribe promise resolution.
- A future shared flow-card controller can extract this lifecycle only after both cards have identical passing tests.
