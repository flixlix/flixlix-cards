# sortable-list-card

## 0.1.3

### Patch Changes

- **Performance:** The card file is 2 to 5% smaller. Cards are now built with Vite+ instead of Rollup and Babel; they still run on the same browsers, including Chromecast and older tablets. ([#471](https://github.com/flixlix/flixlix-cards/pull/471))

## 0.1.2

### Patch Changes

- [#432](https://github.com/flixlix/flixlix-cards/pull/432) [`9ac9962`](https://github.com/flixlix/flixlix-cards/commit/9ac9962716bfe6e7f32d2a7ad94c01d5a95789cf) Thanks [@flixlix](https://github.com/flixlix)! - The version line each card writes to the browser console has a new look.

- [#368](https://github.com/flixlix/flixlix-cards/pull/368) [`7cc309d`](https://github.com/flixlix/flixlix-cards/commit/7cc309d9d5a8f44c644e0c1160b93c67df588f54) Thanks [@flixlix](https://github.com/flixlix)! - Built against the same Lit and Home Assistant websocket versions as the current Home Assistant frontend.

- [#426](https://github.com/flixlix/flixlix-cards/pull/426) [`7dba4d6`](https://github.com/flixlix/flixlix-cards/commit/7dba4d63a8cd32d75ddd2e126749c43a4f819639) Thanks [@flixlix](https://github.com/flixlix)! - Cards load again on Google Cast displays (Chromecast, Nest Hub) and other older browsers and wall-panel webviews that Home Assistant itself still supports (Chromium 67 and newer). Before, the cards shipped optional chaining (`?.`) and nullish coalescing (`??`), which those browsers cannot read, so the card stayed empty or showed "Configuration Error". The cards are about 5% larger as a result.

- [#379](https://github.com/flixlix/flixlix-cards/pull/379) [`ef910cc`](https://github.com/flixlix/flixlix-cards/commit/ef910cca8825a64e7bae4f8d274b94a3deeef6c6) Thanks [@flixlix](https://github.com/flixlix)! - Cards no longer recalculate and redraw when an entity they don't show changes in Home Assistant, which lowers CPU and battery use on dashboards, especially on phones and tablets. Numbers are formatted with reused formatters, and the flow cards no longer measure their width on every update.

## 0.1.2-beta.1

### Patch Changes

- [#432](https://github.com/flixlix/flixlix-cards/pull/432) [`9ac9962`](https://github.com/flixlix/flixlix-cards/commit/9ac9962716bfe6e7f32d2a7ad94c01d5a95789cf) Thanks [@flixlix](https://github.com/flixlix)! - The version line each card writes to the browser console has a new look.

- [#426](https://github.com/flixlix/flixlix-cards/pull/426) [`7dba4d6`](https://github.com/flixlix/flixlix-cards/commit/7dba4d63a8cd32d75ddd2e126749c43a4f819639) Thanks [@flixlix](https://github.com/flixlix)! - Cards load again on Google Cast displays (Chromecast, Nest Hub) and other older browsers and wall-panel webviews that Home Assistant itself still supports (Chromium 67 and newer). Before, the cards shipped optional chaining (`?.`) and nullish coalescing (`??`), which those browsers cannot read, so the card stayed empty or showed "Configuration Error". The cards are about 5% larger as a result.

## 0.1.2-beta.0

### Patch Changes

- [#368](https://github.com/flixlix/flixlix-cards/pull/368) [`7cc309d`](https://github.com/flixlix/flixlix-cards/commit/7cc309d9d5a8f44c644e0c1160b93c67df588f54) Thanks [@flixlix](https://github.com/flixlix)! - Built against the same Lit and Home Assistant websocket versions as the current Home Assistant frontend.

- [#379](https://github.com/flixlix/flixlix-cards/pull/379) [`ef910cc`](https://github.com/flixlix/flixlix-cards/commit/ef910cca8825a64e7bae4f8d274b94a3deeef6c6) Thanks [@flixlix](https://github.com/flixlix)! - Cards no longer recalculate and redraw when an entity they don't show changes in Home Assistant, which lowers CPU and battery use on dashboards, especially on phones and tablets. Numbers are formatted with reused formatters, and the flow cards no longer measure their width on every update.

## 0.1.1

### Patch Changes

- [#289](https://github.com/flixlix/flixlix-cards/pull/289) [`9578318`](https://github.com/flixlix/flixlix-cards/commit/9578318820361367dd92a702b3617b62caf04333) Thanks [@flixlix](https://github.com/flixlix)! - Fix the drag-and-drop drop indicator showing on the dragged row itself (positions adjacent to the dragged item are no-op moves and no longer draw an indicator). Add FLIP slide animations when items change position, and stop the hover highlight from briefly following a row reordered via the arrow buttons. Animations are disabled when `prefers-reduced-motion` is set and in-flight slides are cancelled before a new move so rapid reorders stay smooth.

## 0.1.0

### Minor Changes

- [#286](https://github.com/flixlix/flixlix-cards/pull/286) [`7c39d37`](https://github.com/flixlix/flixlix-cards/commit/7c39d37e03c504cbc2c06f72e93c1eabcfef4ee5) Thanks [@flixlix](https://github.com/flixlix)! - Add Sortable List Card: a generic drag-and-drop reorderable list (TypeScript/Lit) with a full UI editor. Persists the order via any configurable service call (defaulting to `input_text.set_value`), supports CSV or JSON value formats, optional read-back entity, and entity-backed items (name/icon/state). A HEMS load-priority list is one supported use case.
