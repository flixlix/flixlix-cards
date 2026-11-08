---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: the non-fossil node is now hidden while grid import is within the grid's `display_zero_tolerance`, the same as when the grid reads exactly 0 (unless `fossil_fuel_percentage.display_zero` is on).
