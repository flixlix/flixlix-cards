---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: with `clickable_entities` on, nodes can be reached with Tab and opened with Enter, which never worked before. Holding a node's value no longer runs its hold action twice (a `toggle` hold action used to cancel itself out).
