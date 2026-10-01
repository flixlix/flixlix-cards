---
"power-flow-card-plus": minor
"energy-flow-card-plus": minor
---

Fix: the new flow rate model now interpolates dot speed instead of dot duration

`min_flow_rate` and `max_flow_rate` are animation durations, but perceived speed is
their reciprocal, so interpolating the duration linearly against power produced a
hyperbolic speed response. With the default 6s..0.75s range a line running at 90% of
`max_expected_power` animated at only 59% of the top speed, and everything below
roughly half power collapsed into an indistinguishable crawl.

The endpoints are unchanged — `min_expected_power` still maps to `max_flow_rate` and
`max_expected_power` to `min_flow_rate` — but values in between now animate at a speed
that tracks the reading linearly. Values below `min_expected_power` are also clamped to
`max_flow_rate`; previously they produced a duration slower than the configured maximum.

The old flow rate model (`use_new_flow_rate_model: false`) is unaffected.
