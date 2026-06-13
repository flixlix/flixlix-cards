# Plan 010: Fix card-list drift across README, issue templates, and CONTRIBUTING ports

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ecfffc3..HEAD -- README.md CONTRIBUTING.md .github/ISSUE_TEMPLATE/`
> On a mismatch with the excerpts below, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `ecfffc3`, 2026-06-13

## Why this matters

The repo ships four cards, but the README lists three, the feature-request template offers a card that lives in a *different repository* while omitting the two newest cards, and CONTRIBUTING tells contributors to load every card from port 5001 when three of the four serve elsewhere. Users file issues against the wrong card and contributors' first local-dev attempt fails — the cheapest kind of bug to fix.

## Current state

- `README.md:8-12` — Cards list contains Power Flow Card Plus, Energy Flow Card Plus, Energy Breakdown Card. **Missing: Sortable List Card** (exists at `packages/flixlix-cards/sortable-list-card`, has docs routes under `apps/web/src/routes/_docs/`).
- `.github/ISSUE_TEMPLATE/feature-request.yaml:24-27` — dropdown options:

```yaml
options:
  - Power Flow Card Plus
  - Energy Flow Card Plus
  - Energy Period Selector Plus
```

  "Energy Period Selector Plus" is a separate flixlix project **not in this monorepo**; "Energy Breakdown Card" and "Sortable List Card" are missing. `.github/ISSUE_TEMPLATE/bug-report.yaml` exists — inspect it for the same dropdown and fix identically if present.
- `CONTRIBUTING.md:~50-65` — instructs adding the dashboard resource as `http://<your-ip>:5001/<card-filename>.js` with a power-flow example. Actual dev ports (verified): power-flow-card-plus **5001** (default from `packages/tooling/bundler/index.js:14`; its `rollup.config.js` sets no port), energy-flow-card-plus **5003**, energy-breakdown-card **5004**, sortable-list-card **5005** (each card's `rollup.config.js:6`).
- README card entries follow the pattern: `- **<Name>** — [docs](https://cards.flixlix.com/<slug>) · [README](packages/flixlix-cards/<slug>/README.md)`. The sortable-list docs slug: verify with `ls apps/web/src/routes/_docs/` before writing the link.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| YAML validity | `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/ISSUE_TEMPLATE/*.yaml')]"` | exit 0 |
| Slug check | `ls apps/web/src/routes/_docs/` | shows the sortable-list route dir |
| Port check | `grep -n "port" packages/flixlix-cards/*/rollup.config.js` | matches the table above |

## Scope

**In scope** (the only files you should modify):
- `README.md`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/feature-request.yaml`
- `.github/ISSUE_TEMPLATE/bug-report.yaml` (only if it has the same dropdown)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `apps/web/` docs-site content — the site already covers all four cards; also the working tree may carry uncommitted docs-site changes.
- Card package READMEs.

## Git workflow

- Branch: `advisor/010-docs-drift`
- Commit style: `docs: :memo: sync card lists and dev ports`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: README

Add Sortable List Card to the Cards list following the existing entry pattern (verify the docs slug first). Keep ordering consistent with the docs site.

**Verify**: `grep -c "Sortable List Card" README.md` → ≥1.

### Step 2: Issue templates

In `feature-request.yaml` (and `bug-report.yaml` if it has the dropdown), set the options to exactly the four monorepo cards:

```yaml
options:
  - Power Flow Card Plus
  - Energy Flow Card Plus
  - Energy Breakdown Card
  - Sortable List Card
```

Remove "Energy Period Selector Plus" — it has its own repository and issues for it filed here lose context. Note the removal in the PR description so the maintainer can veto (see STOP conditions if unsure).

**Verify**: the YAML-validity command → exit 0; `grep -rn "Energy Period Selector" .github/ISSUE_TEMPLATE/` → no matches.

### Step 3: CONTRIBUTING ports

Replace the single-port instruction with a table:

| Card | Dev server URL |
|------|----------------|
| Power Flow Card Plus | `http://<your-ip>:5001/power-flow-card-plus.js` |
| Energy Flow Card Plus | `http://<your-ip>:5003/energy-flow-card-plus.js` |
| Energy Breakdown Card | `http://<your-ip>:5004/energy-breakdown-card.js` |
| Sortable List Card | `http://<your-ip>:5005/sortable-list-card.js` |

Before writing, confirm each card's built filename (check each card's `rollup.config.js` / `dist` output name) — do not assume `<package-name>.js` without looking.

**Verify**: ports in the table match `grep -n "port" packages/flixlix-cards/*/rollup.config.js` plus the 5001 default.

## Test plan

Docs only: YAML parse check + the greps above. Optionally render README locally to eyeball the list.

## Done criteria

- [ ] README lists all four cards with working relative README links (`ls` each path)
- [ ] Issue-template dropdowns list exactly the four monorepo cards; YAML parses
- [ ] CONTRIBUTING shows the per-card port table with verified filenames
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The maintainer may *intend* to accept Energy Period Selector Plus issues in this repo. If you find evidence of that (existing labeled issues, a comment in the template), keep the option, add the two missing cards, and flag the question in your report instead of removing it.
- A card's built filename can't be confirmed from its rollup config/dist — report rather than guessing the URL.

## Maintenance notes

- When the next card is added, this drift will recur: README list, both issue-template dropdowns, CONTRIBUTING port table, and the docs site all need a row — worth a checklist item in `CLAUDE.md` (Plan 008 follow-up).
