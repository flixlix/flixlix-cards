# Plan 012: Produce a decision brief for the stalled `feat/add-power-pulse-card` branch

> **Executor instructions**: This is a **read-only investigation** plan — it
> modifies no source code and merges/deletes nothing. Its deliverable is a
> report file the maintainer uses to decide. Follow steps in order; on any
> STOP condition, stop and report. When done, update the status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git ls-remote --heads origin feat/add-power-pulse-card`
> If the branch no longer exists, the decision was made — mark this plan
> REJECTED in `plans/README.md` with that note and stop.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

`origin/feat/add-power-pulse-card` exists but was never merged, and no decision is recorded anywhere in the repo. Unmerged feature branches rot: the context for why work stopped lives only in the maintainer's head, and every future contributor (or agent audit) re-discovers and re-questions it. The output here is a one-page brief — what the branch contains, how far it got, what it would take to land — so the maintainer can decide revive / document-and-defer / delete in minutes.

## Current state

- Branch `feat/add-power-pulse-card` exists on origin, never merged to `main` (audit observation at `ecfffc3`; re-verify via the drift check).
- The repo records decisions nowhere structured (no `docs/adr/`, no `DECISIONS.md` — verified during the audit).
- Repo context for assessing the branch: cards live in `packages/flixlix-cards/<card-name>` with `rollup.config.js` (dev port), `src/`, `__tests__/`, `package.json`; a complete card also has docs routes in `apps/web/src/routes/_docs/` and entries in README/issue templates (see Plan 010's lists).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Fetch | `git fetch origin feat/add-power-pulse-card` | exit 0 |
| Merge base | `git merge-base origin/feat/add-power-pulse-card origin/main` | a SHA |
| Branch log | `git log --oneline $(git merge-base origin/feat/add-power-pulse-card origin/main)..origin/feat/add-power-pulse-card` | commit list |
| Diff stat | `git diff --stat $(git merge-base origin/feat/add-power-pulse-card origin/main)..origin/feat/add-power-pulse-card` | file list |
| Read files without checkout | `git show origin/feat/add-power-pulse-card:<path>` | file content |
| PR history | `gh pr list --head feat/add-power-pulse-card --state all` | any associated PRs |

Do **not** `git checkout` the branch (the working tree may hold uncommitted user changes) — read everything via `git show`/`git diff`.

## Scope

**In scope** (the only files you should create/modify):
- `plans/012-power-pulse-report.md` (create — the brief)
- `plans/README.md` (status row)

**Out of scope**: all source code; the branch itself (no rebase, no delete, no merge); GitHub state (no PR creation, no branch deletion).

## Git workflow

- No branch needed — the only artifacts are two files under `plans/`.
- If committing them: `docs: :memo: add power-pulse decision brief`.
- Do NOT push.

## Steps

### Step 1: Inventory the branch

Run the commands above. From the diff, list: new package dir(s), source files and their sizes, tests present?, docs routes present?, changeset present?, rollup config/port?

**Verify**: you have the file list and commit timeline.

### Step 2: Assess completeness

Read the main card source via `git show` (entry component, editor if any). Score against the "complete card" checklist in Current state: builds? (judge statically — do not build), tests?, editor?, docs?, README/template entries? Note how far `main` has drifted under it (`git diff --stat ...origin/main` for shared files it touches — e.g. shared package changes since the merge base).

**Verify**: each checklist item marked yes/no/partial with evidence.

### Step 3: Write the brief

`plans/012-power-pulse-report.md`: (1) what the card does (2-3 sentences, from its code/readme); (2) completeness checklist; (3) drift/rebase cost estimate (S/M/L with the why); (4) three options — **revive** (remaining work list), **defer** (record the deferral + where: suggest a `## Decisions` section in `CLAUDE.md` or a `DECISIONS.md`), **delete** (with a `git tag archive/power-pulse <sha>` suggestion so nothing is lost); (5) a recommendation with one-line rationale.

**Verify**: the report exists and a reader who never saw the branch could decide from it alone.

## Test plan

Not applicable (read-only investigation). Verification is the report's completeness per Step 3's structure.

## Done criteria

- [ ] `plans/012-power-pulse-report.md` exists with all five sections
- [ ] Every claim in it carries a command output or `file` reference from the branch
- [ ] Working tree untouched apart from the two `plans/` files (`git status`)
- [ ] `plans/README.md` status row updated (DONE = brief delivered; the *decision* is the maintainer's)

## STOP conditions

- The branch is gone (drift check) — mark REJECTED with the note.
- The branch contains work clearly unrelated to a "power pulse card" (mis-named branch) — report what it actually is instead of forcing the template.
- `gh` is unauthenticated and PR history is needed for the timeline — note the gap and proceed without it.

## Maintenance notes

- Whatever the maintainer decides, record it where Step 3 suggests — the absence of a decisions log is what made this plan necessary.
- If "revive" is chosen, write a fresh implementation plan against current `main` rather than rebasing blind.
