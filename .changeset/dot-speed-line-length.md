---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: dots move equally fast on short and long lines at the same power, so individual device lines no longer crawl next to the main lines. Flow rates, including `min_flow_rate`, `max_flow_rate` and a fixed `calculate_flow_rate`, are now seconds per 140px of line.
