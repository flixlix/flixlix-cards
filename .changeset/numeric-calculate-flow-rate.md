---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: `calculate_flow_rate` set to a number is now honoured

A numeric `calculate_flow_rate` is documented to pin a line's dot to that many
seconds per traverse, but the value was silently ignored and the computed flow rate
was used instead. Numbers now take precedence, as documented. Setting `true` or
leaving the option unset keeps using the computed flow rate, and `false` still pins
the dot to the 1.66s default.
