---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: dots on short lines, like individual devices, no longer crawl next to the main lines: each line's dot time now scales with the square root of its length. Flow rates, including `min_flow_rate`, `max_flow_rate` and a fixed `calculate_flow_rate`, are seconds per 175px of line.
