# sortable-list-card

## 0.1.1

### Patch Changes

- [#289](https://github.com/flixlix/flixlix-cards/pull/289) [`9578318`](https://github.com/flixlix/flixlix-cards/commit/9578318820361367dd92a702b3617b62caf04333) Thanks [@flixlix](https://github.com/flixlix)! - Fix the drag-and-drop drop indicator showing on the dragged row itself (positions adjacent to the dragged item are no-op moves and no longer draw an indicator). Add FLIP slide animations when items change position, and stop the hover highlight from briefly following a row reordered via the arrow buttons. Animations are disabled when `prefers-reduced-motion` is set and in-flight slides are cancelled before a new move so rapid reorders stay smooth.

## 0.1.0

### Minor Changes

- [#286](https://github.com/flixlix/flixlix-cards/pull/286) [`7c39d37`](https://github.com/flixlix/flixlix-cards/commit/7c39d37e03c504cbc2c06f72e93c1eabcfef4ee5) Thanks [@flixlix](https://github.com/flixlix)! - Add Sortable List Card: a generic drag-and-drop reorderable list (TypeScript/Lit) with a full UI editor. Persists the order via any configurable service call (defaulting to `input_text.set_value`), supports CSV or JSON value formats, optional read-back entity, and entity-backed items (name/icon/state). A HEMS load-priority list is one supported use case.
