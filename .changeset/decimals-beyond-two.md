---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: `base_decimals`, `kilo_decimals`, `mega_decimals` and a node's `decimals` above 2 show every decimal, e.g. `2.356 kW` with `kilo_decimals: 3`, instead of stopping at two.
