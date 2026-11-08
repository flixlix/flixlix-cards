---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: only W and Wh units with an SI prefix are scaled. A water meter in m³ now shows 348.9 m³ instead of 348,900,000 m³, and a sensor in mW is read as milliwatts instead of megawatts. A `unit_of_measurement` of `kW`, `MW`, `kWh` or `MWh` on a node or individual device now shows the reading in that unit (1.5 kW instead of 1,500 kW); any other unit still shows the value as read from the entity.
