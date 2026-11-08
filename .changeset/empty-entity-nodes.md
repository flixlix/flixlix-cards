---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
"home-flow-card": patch
---

A node whose entity was cleared in the visual editor is no longer drawn. Clearing the field leaves an empty entity (`entity: ""`) in the config, and solar and the grid still showed it with a value of 0; now a node is drawn only with a real entity, as the battery already was.
