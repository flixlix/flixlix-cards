---
"power-flow-card-plus": minor
"energy-flow-card-plus": patch
---

Default dot speed is back to how it was before 0.4.0-beta.0: the time per dot shrinks linearly with power (with the defaults, 1000 W takes 3.4 s per dot again). The faster speed-based curve from 0.4.0-beta.0, where twice the power looks about twice as fast, is available with `flow_rate_model: speed`, and `flow_rate_model: relative` selects the relative formula. The option replaces the "New Flow Model?" toggle in the editor with a select. `use_new_flow_rate_model` still works as the older alias (`false` is `relative`); `flow_rate_model` wins when both are set. Energy Flow Card Plus always uses the relative formula and ignores `flow_rate_model`.
