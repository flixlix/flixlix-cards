# Agent guide

Home Assistant Lovelace cards (Lit + TypeScript), pnpm monorepo, Vite+ toolchain.

- Cards: `packages/flixlix-cards/*`. Shared states, calculations, components and types: `packages/shared`.
- Standards: [`CODING_STANDARDS.md`](CODING_STANDARDS.md). Contributor workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Lint/format/test config: root `vite.config.ts`. Custom rules: `packages/tooling/lint-rules` (each rule has RuleTester cases in `index.test.js`).
- Vite+ docs ship locally at `node_modules/vite-plus/docs`.

## Before handing back

```bash
pnpm check && pnpm typecheck && pnpm test
```

All three must pass with zero lint errors. Do not add `oxlint-disable`, `@ts-expect-error`, `as any` or `as unknown as`; fix the type. A bug fix lands with a failing-then-passing test, and if the bug class can recur, with a rule in `packages/tooling/lint-rules`.

User-facing changes to a released card need a changeset (`pnpm changeset`).
