---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: the home circle no longer breaks (NaN segments) when nothing is being consumed. Energy Flow Card Plus now honours `invert_state` on single grid and battery entities, reads non-fossil and grid values from the selected energy period instead of live sensor states, and individual devices with a numeric `calculate_flow_rate` animate consistently in every position.
