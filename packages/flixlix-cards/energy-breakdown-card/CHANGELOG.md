# energy-breakdown-card

## 0.0.5-beta.0

### Patch Changes

- **New:** A card added from the card picker starts with the grid, solar, battery and devices from your energy dashboard, and guesses the rest from entity names more carefully than before. ([#524](https://github.com/flixlix/flixlix-cards/pull/524))

## 0.0.4

### Patch Changes

- **Fix:** The help button in the card editor opens the card's configuration page on cards.flixlix.com instead of an old GitHub README. ([#488](https://github.com/flixlix/flixlix-cards/pull/488))

## 0.0.3

### Patch Changes

- **Performance:** The card file is 2 to 5% smaller. Cards are now built with Vite+ instead of Rollup and Babel; they still run on the same browsers, including Chromecast and older tablets. ([#471](https://github.com/flixlix/flixlix-cards/pull/471))

## 0.0.2

### Patch Changes

- [#370](https://github.com/flixlix/flixlix-cards/pull/370) [`911c1c6`](https://github.com/flixlix/flixlix-cards/commit/911c1c65cb4598106b9d28a97fe792f219aae0aa) Thanks [@flixlix](https://github.com/flixlix)! - With `energy_date_selection: true`, values are shown in the entity's unit: a meter in kWh now shows 6 kWh for the period instead of 6,000 kWh.

- [#432](https://github.com/flixlix/flixlix-cards/pull/432) [`9ac9962`](https://github.com/flixlix/flixlix-cards/commit/9ac9962716bfe6e7f32d2a7ad94c01d5a95789cf) Thanks [@flixlix](https://github.com/flixlix)! - The version line each card writes to the browser console has a new look.

- [#368](https://github.com/flixlix/flixlix-cards/pull/368) [`7cc309d`](https://github.com/flixlix/flixlix-cards/commit/7cc309d9d5a8f44c644e0c1160b93c67df588f54) Thanks [@flixlix](https://github.com/flixlix)! - Built against the same Lit and Home Assistant websocket versions as the current Home Assistant frontend.

- [#426](https://github.com/flixlix/flixlix-cards/pull/426) [`7dba4d6`](https://github.com/flixlix/flixlix-cards/commit/7dba4d63a8cd32d75ddd2e126749c43a4f819639) Thanks [@flixlix](https://github.com/flixlix)! - Cards load again on Google Cast displays (Chromecast, Nest Hub) and other older browsers and wall-panel webviews that Home Assistant itself still supports (Chromium 67 and newer). Before, the cards shipped optional chaining (`?.`) and nullish coalescing (`??`), which those browsers cannot read, so the card stayed empty or showed "Configuration Error". The cards are about 5% larger as a result.

- [#379](https://github.com/flixlix/flixlix-cards/pull/379) [`ef910cc`](https://github.com/flixlix/flixlix-cards/commit/ef910cca8825a64e7bae4f8d274b94a3deeef6c6) Thanks [@flixlix](https://github.com/flixlix)! - Cards no longer recalculate and redraw when an entity they don't show changes in Home Assistant, which lowers CPU and battery use on dashboards, especially on phones and tablets. Numbers are formatted with reused formatters, and the flow cards no longer measure their width on every update.

## 0.0.2-beta.1

### Patch Changes

- [#432](https://github.com/flixlix/flixlix-cards/pull/432) [`9ac9962`](https://github.com/flixlix/flixlix-cards/commit/9ac9962716bfe6e7f32d2a7ad94c01d5a95789cf) Thanks [@flixlix](https://github.com/flixlix)! - The version line each card writes to the browser console has a new look.

- [#426](https://github.com/flixlix/flixlix-cards/pull/426) [`7dba4d6`](https://github.com/flixlix/flixlix-cards/commit/7dba4d63a8cd32d75ddd2e126749c43a4f819639) Thanks [@flixlix](https://github.com/flixlix)! - Cards load again on Google Cast displays (Chromecast, Nest Hub) and other older browsers and wall-panel webviews that Home Assistant itself still supports (Chromium 67 and newer). Before, the cards shipped optional chaining (`?.`) and nullish coalescing (`??`), which those browsers cannot read, so the card stayed empty or showed "Configuration Error". The cards are about 5% larger as a result.

## 0.0.2-beta.0

### Patch Changes

- [#370](https://github.com/flixlix/flixlix-cards/pull/370) [`911c1c6`](https://github.com/flixlix/flixlix-cards/commit/911c1c65cb4598106b9d28a97fe792f219aae0aa) Thanks [@flixlix](https://github.com/flixlix)! - With `energy_date_selection: true`, values are shown in the entity's unit: a meter in kWh now shows 6 kWh for the period instead of 6,000 kWh.

- [#368](https://github.com/flixlix/flixlix-cards/pull/368) [`7cc309d`](https://github.com/flixlix/flixlix-cards/commit/7cc309d9d5a8f44c644e0c1160b93c67df588f54) Thanks [@flixlix](https://github.com/flixlix)! - Built against the same Lit and Home Assistant websocket versions as the current Home Assistant frontend.

- [#379](https://github.com/flixlix/flixlix-cards/pull/379) [`ef910cc`](https://github.com/flixlix/flixlix-cards/commit/ef910cca8825a64e7bae4f8d274b94a3deeef6c6) Thanks [@flixlix](https://github.com/flixlix)! - Cards no longer recalculate and redraw when an entity they don't show changes in Home Assistant, which lowers CPU and battery use on dashboards, especially on phones and tablets. Numbers are formatted with reused formatters, and the flow cards no longer measure their width on every update.

## 0.0.1

### Patch Changes

- [#270](https://github.com/flixlix/flixlix-cards/pull/270) [`0489868`](https://github.com/flixlix/flixlix-cards/commit/0489868cb879f822ed93696306d739cfb7c61bce) Thanks [@flixlix](https://github.com/flixlix)! - initial version

## 0.1.0

### Minor Changes

- Initial release: donut and bar chart variants, optional legend with names/values/percentages, mobile-friendly tooltip, per-entity color/icon customization, `group_others` and `max_items` options.
