---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
"home-flow-card": patch
---

fix: entities are clickable again when the config has no `clickable_entities` line, as before 0.4.0, and now also on Home Flow Card. Only `clickable_entities: false` turns it off.
