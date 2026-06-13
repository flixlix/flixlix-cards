# Plan 016: Cut per-render micro-costs — cached number formatter, ResizeObserver hygiene

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- packages/shared/src/utils/display-value.ts packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts`
> If the "Current state" excerpts below no longer match the live code, treat it
> as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (sequence with Plans 005/015 — same card files; see `plans/README.md` dependency notes)
- **Category**: perf
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

Two small costs run on every update of both flow cards — which, until Plan 005 lands, means on every state change of any entity in the Home Assistant instance:

1. `displayValue` calls `formatNumber` from `custom-card-helpers`, which constructs a **new `Intl.NumberFormat` on every call** (verified in `custom-card-helpers@1.9.0` dist: `return new Intl.NumberFormat(i, V(e,n)).format(Number(e))`). A card displays ~5–15 formatted values per render; `Intl.NumberFormat` construction is one of the more expensive standard-library calls and is trivially cacheable.
2. Both cards' `updated()` re-call `resizeObserver.observe(elem)` **and** `elem.getBoundingClientRect()` (a forced synchronous layout) on every update, although the observer only needs to attach once and delivers sizes via its callback.

Individually minor; together they remove constant per-update overhead on the hottest path for near-zero risk.

## Current state

- `packages/shared/src/utils/display-value.ts` — formats every value shown in the circles. The relevant call (lines 57-66):

```ts
const v = formatNumber(
  transformValue(
    isMega
      ? round(valueInNumber / 1000000, decimalsToRound ?? 2)
      : isKilo
        ? round(valueInNumber / 1000, decimalsToRound ?? 2)
        : round(valueInNumber, decimalsToRound ?? 0)
  ),
  hass.locale
);
```

Facts about `formatNumber(value, locale)` for a **number** input with **no options** (the only way `display-value.ts` calls it), verified against the `custom-card-helpers@1.9.0` source:
  - locale resolution: `numberFormatToLocale(locale)` (exported by `custom-card-helpers`) maps `locale.number_format` to a locale-array or `undefined`;
  - when `locale.number_format === "none"` it skips `Intl` entirely (cheap — no caching needed);
  - otherwise it constructs `new Intl.NumberFormat(locales, { maximumFractionDigits: 2 })` per call (for number inputs the options are always exactly `{ maximumFractionDigits: 2 }`), with a try/catch falling back to `new Intl.NumberFormat(undefined, ...)` on invalid locale.

- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts:506-532` — the `updated()` excerpt:

```ts
const elem = this.shadowRoot?.querySelector("#power-flow-card-plus") as HTMLElement | null;
if (elem) {
  if (!this._resizeObserver) {
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      if (width !== this._width) {
        this._width = width;
      }
    });
  }
  this._resizeObserver.observe(elem);
  const width = Math.round(elem.getBoundingClientRect().width);
  if (width !== this._width) {
    this._width = width;
  }
}
```

- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts:667-693` — identical pattern with `#energy-flow-card-plus`.
- `_width` is a Lit `@state`; the ResizeObserver spec guarantees the callback fires once upon `observe()` with the current size, so the `getBoundingClientRect` fallback is redundant (it only changes *when* the first width arrives: synchronously today vs. one observer tick later — both cause one extra render after first paint).
- Shared test convention: vitest in `packages/shared/__tests__/`, node environment; `displayValue` is already tested in `core-utils.test.ts` (it builds configs and asserts formatted strings — model after those).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Shared tests | `pnpm --filter @flixlix-cards/shared test` | all pass |
| Card tests | `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` | all pass |
| All gates | `pnpm test && pnpm typecheck && pnpm lint && pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/utils/display-value.ts`
- `packages/shared/__tests__/core-utils.test.ts` (add formatter-cache tests)
- `packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts` (only the `updated()` method + a private field)
- `packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` (same)
- `.changeset/<generated>.md` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Upgrading/patching `custom-card-helpers` itself — abandoned upstream; migration is a separate deferred decision (see Plan 009 maintenance notes).
- Other `formatNumber` call sites outside `display-value.ts` (if any exist, leave them; this plan optimizes the hot path only).
- `willUpdate`, the resync blocks, template logic.

## Git workflow

- Branch: `advisor/016-render-loop-micro-costs`
- Commit style: `perf: :zap: cache number formatters and fix ResizeObserver churn`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Cached formatter in `display-value.ts`

Add a module-level cache and a helper that mirrors `formatNumber`'s numeric branch exactly:

```ts
import { type HomeAssistant, formatNumber, numberFormatToLocale } from "custom-card-helpers";

const numberFormatters = new Map<string, Intl.NumberFormat>();

const formatDisplayNumber = (value: number, locale: HomeAssistant["locale"]): string => {
  // "none" (and the no-Intl path) is cheap in formatNumber — delegate for exact parity.
  if (!locale || locale.number_format === "none") return formatNumber(value, locale);
  const key = `${locale.language}|${locale.number_format}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(numberFormatToLocale(locale), { maximumFractionDigits: 2 });
    } catch {
      formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    numberFormatters.set(key, formatter);
  }
  return formatter.format(value);
};
```

Replace the `formatNumber(...)` call in `displayValue` with `formatDisplayNumber(...)`. The cache key covers everything that affects output (`language` + `number_format`); the options are constant for number inputs, and the cache stays tiny (one entry per locale the user switches through).

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all existing `displayValue` tests pass unchanged (they are the parity proof).

### Step 2: Parity tests

In `packages/shared/__tests__/core-utils.test.ts`, add tests asserting `displayValue` output equals what direct `formatNumber` returns for the same input across locales — e.g. value `1234.5` (kilo path) with `hass.locale = { language: "de", number_format: "decimal_comma" }` and `{ language: "en", number_format: "comma_decimal" }`, plus one `number_format: "none"` case. Build the `hass` stub the same way the existing `displayValue` tests in this file do. Call each twice to exercise the cache-hit path.

**Verify**: `pnpm --filter @flixlix-cards/shared test` → all pass, including ≥3 new tests.

### Step 3: ResizeObserver hygiene in both cards

In each card's `updated()`, replace the excerpt shown in "Current state" with attach-once logic; add a private field `private _resizeObservedElement?: HTMLElement;`:

```ts
const elem = this.shadowRoot?.querySelector("#power-flow-card-plus") as HTMLElement | null; // energy card: #energy-flow-card-plus
if (elem && this._resizeObservedElement !== elem) {
  if (!this._resizeObserver) {
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      if (width !== this._width) {
        this._width = width;
      }
    });
  }
  if (this._resizeObservedElement) this._resizeObserver.unobserve(this._resizeObservedElement);
  this._resizeObserver.observe(elem);
  this._resizeObservedElement = elem;
}
```

The `getBoundingClientRect()` block is deleted — the observer callback delivers the initial width. In `disconnectedCallback` (both cards), also clear `this._resizeObservedElement = undefined;` next to the existing `this._resizeObserver = undefined;`.

**Verify**: `pnpm --filter power-flow-card-plus test && pnpm --filter energy-flow-card-plus test` → all pass.

### Step 4: Full gates + changeset

Changeset (patch) for both flow cards: "Perf: cache number formatters and stop re-attaching the resize observer on every update".

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → exit 0.

## Test plan

- Shared: ≥3 new parity tests (Step 2) proving the cached formatter is output-identical to `formatNumber` across `decimal_comma`, `comma_decimal`, and `none`.
- Cards: existing `render.test.ts` suites pass unmodified. Note their shape (verified): they instantiate the card, call `connectedCallback()` and `render()` directly — `updated()` never runs, so the ResizeObserver path is not exercised by tests in either direction. The type checker and the unchanged-render assertion are the automated net here; the observer change itself is verified by reading + the manual check in Maintenance notes.

## Done criteria

- [ ] `pnpm test` exits 0, including the new parity tests
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0
- [ ] `grep -n "getBoundingClientRect" packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts packages/flixlix-cards/energy-flow-card-plus/src/energy-flow-card-plus.ts` → no matches inside `updated()` (other occurrences, if any, untouched)
- [ ] `grep -n "numberFormatters" packages/shared/src/utils/display-value.ts` → ≥2 matches
- [ ] Changeset exists (patch, both flow cards)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any existing `displayValue` test fails after Step 1 — the cached path is not parity; do not adjust the test.
- `numberFormatToLocale` is not exported by the installed `custom-card-helpers` version (check `node_modules/custom-card-helpers/dist/index.d.ts`) — report; do not vendor a copy.
- The `updated()` excerpts don't match live code (drift — Plan 015 also edits these methods; if it landed first, apply the same logic around its changes and note the merge in your report).

## Maintenance notes

- If `custom-card-helpers` is ever replaced (deferred decision, see Plan 009), `formatDisplayNumber` is the single seam to update.
- The formatter cache assumes options are constant for number inputs; anyone adding `minimumFractionDigits`-style options to `displayValue` must add them to the cache key.
- Reviewer: confirm the one-frame difference in initial width measurement (observer tick vs. synchronous rect) causes no visible layout flash on first card paint.
