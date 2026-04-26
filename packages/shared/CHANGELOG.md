# @flixlix-cards/shared

## 0.0.3

### Patch Changes

- [#227](https://github.com/flixlix/flixlix-cards/pull/227) [`b8ce9e2`](https://github.com/flixlix/flixlix-cards/commit/b8ce9e2a428b97a595ef4e3816f5a6f055678e49) Thanks [@flixlix](https://github.com/flixlix)! - refactor: kilo_threshold avoid redundancy in displayValue func

- [#239](https://github.com/flixlix/flixlix-cards/pull/239) [`5d493fc`](https://github.com/flixlix/flixlix-cards/commit/5d493fc659d6cb8152fc944876d7e31017b25ce3) Thanks [@flixlix](https://github.com/flixlix)! - feat: add `collection_key` option to bind the card to a specific energy data collection, matching the behavior of Home Assistant's built-in Energy Distribution card. Useful when multiple energy dashboards exist and the card should follow a specific dashboard's selected period instead of the active one.

- [#225](https://github.com/flixlix/flixlix-cards/pull/225) [`8894f43`](https://github.com/flixlix/flixlix-cards/commit/8894f435d4996a2d31efb03cd4228f3959170943) Thanks [@panda7789](https://github.com/panda7789)! - fix: update czech translations

- [#239](https://github.com/flixlix/flixlix-cards/pull/239) [`5d493fc`](https://github.com/flixlix/flixlix-cards/commit/5d493fc659d6cb8152fc944876d7e31017b25ce3) Thanks [@flixlix](https://github.com/flixlix)! - feat: add energy collection_key config setting

- [#226](https://github.com/flixlix/flixlix-cards/pull/226) [`44f66ae`](https://github.com/flixlix/flixlix-cards/commit/44f66ae8b0c4fd29c4af753bfa85d89516611284) Thanks [@flixlix](https://github.com/flixlix)! - fix get energy states vs recorder states

- [#227](https://github.com/flixlix/flixlix-cards/pull/227) [`46c3785`](https://github.com/flixlix/flixlix-cards/commit/46c3785435d1188b2d780fd02da5b548e3148a9b) Thanks [@flixlix](https://github.com/flixlix)! - fix: get default config for correct energy entities instead of power

- [#227](https://github.com/flixlix/flixlix-cards/pull/227) [`e9181b2`](https://github.com/flixlix/flixlix-cards/commit/e9181b2cd8c88400d1283aa84d3c26bf1016696b) Thanks [@flixlix](https://github.com/flixlix)! - feat: allow megawatt and MWh units with threshold and decimals

## 0.0.2

### Patch Changes

- 06b53c1: fix circle color when no activity
- 71cac7d: clickable entities cursor true by default
- 34aa17d: update config struct for energy card
- 71cac7d: fix home not clickable when action was defined

## 0.0.1

### Patch Changes

- 655d4e8: extract into shared package
- ea6f3d6: initial version
