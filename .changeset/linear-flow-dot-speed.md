---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

With the new flow rate model, dot speed now grows in step with power: twice the power looks about twice as fast. Before, the time per dot shrank in step with power, so most of the range crawled and only values close to `max_expected_power` looked fast. `min_expected_power` still gives the slowest dots (`max_flow_rate`) and `max_expected_power` the fastest (`min_flow_rate`). In between, dots now move faster than before: with the defaults, a flow at half of `max_expected_power` takes 1.3 s per dot instead of 3.4 s. Values below `min_expected_power` no longer move slower than `max_flow_rate`. The old flow rate model (`use_new_flow_rate_model: false`) is unchanged.

`calculate_flow_rate` set to a number now does what the documentation says: a line moves one dot every that many seconds. Before, the number was only used when no flow rate could be calculated.
