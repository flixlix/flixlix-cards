# Coding standards

Read by `/code-review` (Standards axis). One line per standard. Mechanical rules live in `vite.config.ts` (oxlint/oxfmt), `packages/tooling/lint-rules` and CI, not here.

- Only mention in comments what cannot be discerned from the code. Delete any claim derivable from the code.
- Tautological tests considered harmful: a test that restates the implementation or asserts on file contents proves nothing.
- Test behaviour through the public surface of a package, not its internals. Tests sit next to the module they test (`<module>.test.ts`); no `__tests__` directories.
- Name things after what they are in the domain (node, flow, entity, tolerance, secondary info), not after their shape or lifecycle (data, item, manager, helper, obj). Prefer plain, jargon-free file names.
- Prefer a small named function over a comment explaining a block.
- No speculative abstractions: an interface with one implementation needs a reason in the PR description.
- Errors carry enough context to act on them; never swallow, never log-and-continue.
- Changesets describe the change for the reader of the changelog, not the reviewer.
- A changeset is one paragraph of at most 280 characters, starting with its type (`breaking:`, `feat:`, `fix:`, `perf:`, `docs:`, `chore:`): what the user notices, not how it works. Details, examples and tables go in the README and docs. One changeset per user-visible change.
- Never silence the linter or type checker (`oxlint-disable`, `@ts-expect-error`, `as any`, `as unknown as`); fix the type or the code.
- A bug fix lands with a test that fails without it; a bug class that can recur lands with a rule in `packages/tooling/lint-rules`.
- Card modules render; calculations (states, tolerance, distribution, flow rates) live in shared, pure, typed modules that take their inputs as arguments.
- A change to a user-facing option or behaviour updates, in the same PR, the card's README, the docs site (`apps/web`), the UI editor schema (for config options) and a changeset.
