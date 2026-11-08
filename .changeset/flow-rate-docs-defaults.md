---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Docs now state the real flow-rate defaults (no behaviour change): Power Flow Card Plus uses the new flow formula unless `use_new_flow_rate_model: false`, Energy Flow Card Plus always uses the relative formula (so `use_new_flow_rate_model`, `min_expected_power` and `max_expected_power` don't apply to it), and an unset `calculate_flow_rate` uses the calculated rate.
