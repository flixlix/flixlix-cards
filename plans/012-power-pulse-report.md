# Decision Brief: `feat/add-power-pulse-card`

**Branch**: `origin/feat/add-power-pulse-card` (tip `8fd3e78`)  
**Merge base**: `87bb1a5` (37 commits behind `origin/main` as of 2026-06-13)  
**PR history**: none (no PR was ever opened — `gh pr list --head feat/add-power-pulse-card --state all` returned nothing)  
**Commits on branch**: 2 (`feat: :sparkles: add power pulse card`, `style: :art: format`)

---

## 1. What the card does

Power Pulse Card is a Home Assistant Lovelace card that visualises real-time power flow with the **home node at the centre**, multiple solar arrays and batteries as source nodes fanning in from the top, and individual devices fanning out at the bottom. Animated pill-shaped flow segments whose speed and gap react to live power values replace the simpler dot-stream of `power-flow-card-plus`. Numbers transition smoothly between values rather than snapping. A smart layout algorithm shrinks gaps before dropping low-power items when space is tight, and flows auto-fade when power drops to zero. A full visual editor (`ui-editor.ts`, 381 lines) is included.

The card is a **direct spiritual successor to `power-flow-card-plus`** — registered as custom element `power-pulse-card`, version `0.0.1-alpha.1`.

---

## 2. Completeness checklist

Evidence sources: `git diff --stat` and `git show origin/feat/add-power-pulse-card:<path>`.

| Item | Status | Evidence |
|------|--------|----------|
| Package directory (`packages/flixlix-cards/power-pulse-card/`) | YES | diff stat shows 37 new files |
| Main card source (`src/power-pulse-card.ts`) | YES | 915 lines, complete `LitElement` component |
| Types (`src/types.ts`) | YES | 70 lines |
| UI editor (`src/ui-editor/ui-editor.ts`) | YES | 381 lines, full schema (`_schema-all.ts` + per-entity schemas) |
| Tests | YES | 5 test files: `compute-flow`, `flow-shape`, `format-power`, `render`, `resolve-color` (totalling ~465 lines) |
| `rollup.config.js` | YES (partial) | Exists and uses `createCardConfig`; **no `port:` assigned** — every other card has a unique dev port (5003–5005). Next available: 5006 |
| `package.json` | YES | Full scripts, deps, devDeps; version `0.0.1-alpha.1` |
| `tsconfig.json` / `vitest.config.ts` / `eslint.config.mjs` | YES | All present |
| `hacs.json` | YES | Present, `render_readme: true`, HA >= 2024.4.0 |
| `README.md` | YES | 434 lines; thorough installation, config reference, and comparison with `power-flow-card-plus` |
| Changeset | NO | `.changeset/` dir on branch shows only `README.md` and `config.json` (the repo-level skeleton); no card-specific changeset file |
| Docs route (`apps/web/src/routes/_docs/power-pulse-card/`) | NO | Not present in the branch diff; `main` has routes for `energy-breakdown-card`, `energy-flow-card-plus`, `power-flow-card-plus`, `sortable-list-card` |
| Root `README.md` entry | NO | Not added in the branch |
| Issue template dropdown entry | NO | `bug-report.yaml` lists three legacy cards; `power-pulse-card` not added |
| Dev port in rollup config | NO | `port:` field missing; next available is `5006` |
| `shared/src/i18n/languages/en.json` additions | YES | ~38 new editor translation keys added |
| `shared/src/const/chars.ts` addition | YES | 1 line added |

**Summary**: Core implementation (card, editor, types, utils, tests, README, hacs.json) is complete and appears production-ready at a code level. Four finishing touches are missing: changeset, docs route, root README entry, and issue template entry. The rollup dev-port omission is minor.

---

## 3. Drift / rebase cost estimate: **S**

- `main` is 37 commits ahead of the merge base (`87bb1a5`).
- The branch touches three `packages/shared` files (`chars.ts`, `en.json`, `link-subpage.ts`). A `git diff` of those same files on `main` since the merge base produces **no output** — they have not been modified on `main`. No semantic conflicts.
- The only other overlap is `pnpm-lock.yaml` (always auto-resolvable) and `.hass_dev/packages/number.yaml` (a trivial dev fixture change: `max: 100` → `max: 10000`).
- New cards (`sortable-list-card`, `energy-breakdown-card`) were added on `main` but touch different package directories entirely.
- **Verdict**: a `git rebase origin/main` has a very low probability of real conflicts. Cost is a single developer session (~1–2 hours including finishing touches).

---

## 4. Three options

### A. Revive

Rebase onto current `main` and complete the four missing items:

1. Run `git rebase origin/main` from the branch (expect no conflicts beyond lock-file).
2. Add `port: 5006` to `rollup.config.js`.
3. Create a changeset: `pnpm changeset` → new card, semver minor (or patch for a pre-release), describe `power-pulse-card@0.1.0`.
4. Add `apps/web/src/routes/_docs/power-pulse-card/` docs route (copy pattern from `sortable-list-card/`).
5. Add a root `README.md` entry line for Power Pulse Card.
6. Add `Power Pulse Card` to the dropdown in `.github/ISSUE_TEMPLATE/bug-report.yaml`.
7. Open a PR — no further code changes should be needed.

### B. Defer

Record the deferral so it does not re-surface as a mystery. Suggested location: add a `## Decisions` section to `CLAUDE.md` (already exists in root) or create a `DECISIONS.md` at repo root. Entry text:

> **2026-06-13 — power-pulse-card deferred**: `feat/add-power-pulse-card` contains a complete implementation but was not merged. Decision: hold until [reason, e.g. "community demand for a second power-flow variant is assessed"]. Revisit trigger: [e.g., "first GitHub issue requesting it"]. Branch retained.

Leave the branch in place.

### C. Delete

Archive the tip SHA so work is not lost, then delete:

```bash
git tag archive/power-pulse-card 8fd3e78
git push origin archive/power-pulse-card
git push origin --delete feat/add-power-pulse-card
```

Record the archive tag in `DECISIONS.md` / `CLAUDE.md` so a future contributor knows where to find the work.

---

## 5. Recommendation: **Revive (Option A)**

**Rationale**: The card is functionally complete — 915-line main component, full UI editor, 5 test suites, thorough README, and hacs.json. The missing items (changeset, docs route, two metadata entries, one rollup field) are boilerplate that takes under an hour. The drift is cosmetic: no shared-file conflicts exist. `power-pulse-card` is meaningfully differentiated from `power-flow-card-plus` (centered home, multiple solar/battery nodes, pill flows, animated numbers) and would be a net addition to the card suite with minimal landing cost. The risk of leaving it unmerged is that the implementation drifts further or is silently abandoned, which would waste the substantial work already done.

If the maintainer is not ready to support a second power-flow variant right now, **Option B (defer with a written record)** is strongly preferred over doing nothing — the absence of any decision record is what created the ambiguity this brief is resolving.
