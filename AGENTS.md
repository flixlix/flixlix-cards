# Agent guide

Home Assistant Lovelace cards (Lit + TypeScript), pnpm monorepo, Vite+ toolchain.

- Cards: `packages/flixlix-cards/*`. Shared states, calculations, components and types: `packages/shared`.
- Standards: [`CODING_STANDARDS.md`](CODING_STANDARDS.md). Contributor workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Lint/format/test config and tasks: root `vite.config.ts`; workspace scripts run through `vp run` (no Turborepo). Custom rules: one file per rule in `packages/tooling/lint-rules/rules/`, each with a `<rule>.test.js` of RuleTester cases, registered in `plugin.js`.
- Vite+ docs ship locally at `node_modules/vite-plus/docs`.
- Browser tests: `<card>.browser.test.ts` next to the card mounts it in Chromium with a fake `hass` (harness in `packages/shared/src/testing/`: `fakeHass`, `mountCard`, the `flowScenarios` table). `<card>.visual.browser.test.ts` compares screenshots; baselines are made only in Docker with `pnpm test:visual:update` and committed. First run needs `pnpm --filter power-flow-card-plus exec playwright install chromium`.

## Before handing back

```bash
pnpm check && pnpm typecheck && pnpm test
```

All three must pass with zero lint errors (`pnpm test` runs node and browser tests). After a visual change, run `pnpm test:visual` (Docker) and update baselines only for intended changes. Do not add `oxlint-disable`, `@ts-expect-error`, `as any` or `as unknown as`; fix the type. A bug fix lands with a failing-then-passing test, and if the bug class can recur, with a rule in `packages/tooling/lint-rules`.

## End-to-end against Home Assistant

Needs Docker; not part of `pnpm test`. See [`e2e/README.md`](e2e/README.md).

```bash
pnpm hass:up     # build cards, start HA (localhost:8123, dev/dev), bootstrap
pnpm e2e         # Playwright against it (pnpm e2e:ui for UI mode)
pnpm hass:down   # stop; pnpm hass:reset wipes generated state
```

Dummy entities and scenario scripts: `.hass_dev/packages/`; one YAML dashboard per card: `.hass_dev/dashboards/`. The scenario matrix belongs in the browser tests with a fake hass; e2e covers only what needs a real HA.

User-facing changes to a released card need, in the same PR: a changeset (`pnpm changeset`), the card README, the docs site (`apps/web`) and, for config options, the UI editor schema.

## Pull requests

Write the PR body following [`docs/pull-requests.md`](docs/pull-requests.md): summary from the issue with the smallest visual of the change, before/after evidence, merge danger, what was left out, and the template checklist.
