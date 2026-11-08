---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Visual editor: filling in a "Separated" consumption/production field while `entity` held a single sensor no longer saves that sensor split into characters (`'0': s`, `'1': e`, …). Configs already saved that way are cleaned the next time the entity's page is edited.
