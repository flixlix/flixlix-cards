---
"sortable-list-card": patch
---

Fix the drag-and-drop drop indicator showing on the dragged row itself (positions adjacent to the dragged item are no-op moves and no longer draw an indicator). Add FLIP slide animations when items change position, and stop the hover highlight from briefly following a row reordered via the arrow buttons. Animations are disabled when `prefers-reduced-motion` is set and in-flight slides are cancelled before a new move so rapid reorders stay smooth.
