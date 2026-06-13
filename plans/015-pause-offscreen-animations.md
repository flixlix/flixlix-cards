# Plan 015: Pause flow animations off-screen and honor prefers-reduced-motion

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts packages/shared/src/utils/check-should-show-dots.ts`
> If the "Current state" excerpts below no longer match the live code, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (sequence with Plans 005/016 — same card files; see `plans/README.md` dependency notes)
- **Category**: perf
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

The flow dots are SMIL `<animateMotion>` animations — they run on the main thread and repaint their SVG every frame, for up to ~11 dots per card (6 flows + 4 individuals + non-fossil). They keep running while the card is scrolled out of view, so a dashboard with several cards below the fold pays continuous paint cost for animations nobody sees. Pausing the SVG timelines when the card leaves the viewport eliminates that cost. Separately, users who set the OS-level "reduce motion" preference currently still get all dots; the sortable-list card already honors the preference and the flow cards should too — it's both an accessibility and a low-end-device win.

## Current state

- Both cards render their animated flows inside their shadow root; every animated dot lives in an `<svg>` element (`SVGSVGElement` has `pauseAnimations()` / `unpauseAnimations()` which pause **all** SMIL animations in that SVG's timeline).
- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts` — lifecycle excerpts:

```ts
// power-flow-card-plus.ts:173-189
public connectedCallback() {
  super.connectedCallback();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }
  this._tryConnectAll();
}

public disconnectedCallback() {
  this._resizeObserver?.disconnect();
  this._resizeObserver = undefined;
  ...
}
```

- The duration-resync block (runs inside `_computeRenderData`) **unconditionally unpauses** — this must respect the new paused state or it will silently resume hidden animations:

```ts
// power-flow-card-plus.ts:951-955
flowSVGElement.pauseAnimations();
flowSVGElement.setCurrentTime(
  flowSVGElement.getCurrentTime() * (newDur[flowName] / this.previousDur[flowName])
);
flowSVGElement.unpauseAnimations();
```

The energy card has the same block with extra `Number.isFinite` guards at `energy-flow-card-plus.ts:1131-1156` (`flowSVGElement.pauseAnimations(); ... flowSVGElement.unpauseAnimations();` at 1147-1151).

- `packages/shared/src/utils/check-should-show-dots.ts` — current implementation, called by every flow/dot component before rendering a dot:

```ts
export const checkShouldShowDots = (config: FlowCardPlusConfig) => {
  if (config.disable_dots === true) {
    return false;
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  return true;
};
```

- The repo's existing reduced-motion pattern (match it): `packages/flixlix-cards/sortable-list-card/src/sortable-list-card.ts:160` — `if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;`
- Test environments: card tests (`packages/flixlix-cards/*/__tests__/render.test.ts`) run in **jsdom**, which has **no `IntersectionObserver`** and no `pauseAnimations()` on SVG elements — all new browser-API usage must be feature-guarded. Shared tests run in a **node** environment (no `window` at all) — reduced-motion tests must `vi.stubGlobal`.
- Shared test convention: vitest `describe`/`test`/`expect` from `"vitest"`, files in `packages/shared/__tests__/` — model after `core-utils.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Shared tests | `pnpm --filter @flixlix-cards/shared test` | all pass |
| Card tests | `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` | all pass |
| All gates | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/utils/check-should-show-dots.ts`
- `packages/shared/__tests__/core-utils.test.ts` (add reduced-motion tests)
- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts`
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
- `.changeset/<generated>.md` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `sortable-list-card` — already handles reduced motion.
- The flow components in `packages/shared/src/components/` — they already call `checkShouldShowDots`; no signature change.
- `energy-breakdown-card` — different rendering model.
- Template subscriptions, energy-collection refresh logic, `willUpdate` triggers (Plan 005's territory).

## Git workflow

- Branch: `advisor/015-pause-offscreen-animations`
- Commit style: `perf: :zap: pause flow animations off-screen and honor prefers-reduced-motion`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: prefers-reduced-motion in `checkShouldShowDots`

Extend `checkShouldShowDots` with this precedence (order matters — an explicit user choice beats the OS preference):

1. `config.disable_dots === true` → `false` (unchanged)
2. `config.disable_dots === false` → skip the reduced-motion check (explicit opt-in keeps dots)
3. `typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches` → `false`
4. document hidden → `false` (unchanged)
5. otherwise `true`

Keep it dependency-free and SSR/test-safe (every browser global behind a `typeof` guard or optional chaining).

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass (existing tests unaffected because node env has no `window`).

### Step 2: Tests for the new branch

In `packages/shared/__tests__/core-utils.test.ts`, add tests using `vi.stubGlobal` (import `vi` from `"vitest"`, call `vi.unstubAllGlobals()` in `afterEach`):

- `window.matchMedia` returns `{ matches: true }` → `checkShouldShowDots({} as FlowCardPlusConfig)` is `false`;
- same stub but `disable_dots: false` → `true` (explicit override);
- `matches: false` → `true`;
- no `window` stub at all → `true` (node-env default unchanged).

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass, including 4 new tests.

### Step 3: IntersectionObserver pause/resume in the power card

In `power-flow-card-plus.ts`:

1. Add private fields: `private _intersectionObserver?: IntersectionObserver;` and `private _animationsPaused = false;`
2. Add a helper that applies the current state to every SVG in the shadow root (new SVGs appear on re-render, so this must be re-runnable):

```ts
private _applyAnimationPauseState(): void {
  const svgs = this.shadowRoot?.querySelectorAll<SVGSVGElement>("svg") ?? [];
  svgs.forEach((svg) => {
    if (typeof svg.pauseAnimations !== "function") return; // jsdom / old browsers
    if (this._animationsPaused) svg.pauseAnimations();
    else svg.unpauseAnimations();
  });
}
```

3. In `connectedCallback`, after the existing listener setup, create and attach the observer (feature-guarded):

```ts
if (typeof IntersectionObserver !== "undefined") {
  this._intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    this._animationsPaused = !entry.isIntersecting;
    this._applyAnimationPauseState();
  });
  this._intersectionObserver.observe(this);
}
```

4. In `disconnectedCallback`, mirror the resize-observer cleanup: `this._intersectionObserver?.disconnect(); this._intersectionObserver = undefined;`
5. At the **end** of `updated(...)`, call `this._applyAnimationPauseState()` only when `this._animationsPaused` is true (re-renders create fresh, running SVGs).
6. In the duration-resync block (`power-flow-card-plus.ts:951-955` excerpt above), make the resume conditional: replace `flowSVGElement.unpauseAnimations();` with `if (!this._animationsPaused) flowSVGElement.unpauseAnimations();`

**Verify**: `pnpm --filter power-flow-card-plus test` → all pass (jsdom has no `IntersectionObserver`; the guard must make this a no-op there).

### Step 4: Same change in the energy card

Apply Step 3 identically in `energy-flow-card-plus.ts` (its resync resume is the `flowSVGElement.unpauseAnimations();` at ~line 1151; its `updated()` is at ~line 667).

**Verify**: `pnpm --filter energy-flow-card-plus test` → all pass.

### Step 5: Full gates + changeset

Changeset (patch) for both flow cards: "Perf: flow animations now pause while the card is off-screen, and the animated dots respect the OS reduced-motion preference (set `disable_dots: false` to force them on)".

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → exit 0.

## Test plan

- Shared: 4 new `checkShouldShowDots` tests (Step 2), in `packages/shared/__tests__/core-utils.test.ts`, modeled on its existing tests.
- Cards: the existing `render.test.ts` suites are the regression net — they must pass **unmodified**, which simultaneously proves the feature guards work in jsdom.
- Manual (record in the PR description, not automatable here): in a browser, scroll a dashboard so the card leaves the viewport → DevTools paint flashing stops for the card; scroll back → dots resume from where they paused.

## Done criteria

- [ ] `pnpm test` exits 0, including 4 new shared tests, with **zero modifications** to existing card render tests
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0
- [ ] `grep -n "prefers-reduced-motion" packages/shared/src/utils/check-should-show-dots.ts` → 1 match
- [ ] `grep -n "_applyAnimationPauseState" packages/flixlix-cards/*/src/*.ts` → matches in exactly the two flow cards
- [ ] `grep -n "unpauseAnimations" packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` → every resync-resume occurrence sits behind an `_animationsPaused` check
- [ ] Changeset exists (patch, both flow cards)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Existing card render tests fail after Step 3/4 — the lifecycle wiring is wrong; do not patch the tests.
- The resync excerpts don't match the live code (drift — Plan 017 may have replaced SMIL entirely; if so this plan's Steps 3–4 are obsolete and only Steps 1–2 still apply — report before proceeding).
- You find additional `unpauseAnimations()` call sites beyond the two resync blocks — the plan's model of the code is incomplete.
- Implementing requires changes to the shared flow components — the pause mechanism must stay card-level.

## Maintenance notes

- Plan 017 (CSS Motion Path) replaces SMIL; when it lands, `_applyAnimationPauseState` should switch from `pauseAnimations()` to toggling a host class driving `animation-play-state: paused`. Plan 017 owns that port.
- The IntersectionObserver uses default thresholds (any intersection = visible). If users report dots "stuck" at viewport edges, add `rootMargin` rather than thresholds.
- Reviewer: scrutinize the `disable_dots === false` override semantics — it is the documented escape hatch for users who want dots despite reduced-motion.
- Deferred: a docs-site note on `disable_dots` / reduced-motion behavior (docs live in `apps/web`, which carries active maintainer work).
