# energy-breakdown-card

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
