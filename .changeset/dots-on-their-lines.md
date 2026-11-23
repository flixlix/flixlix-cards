---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: flow dots stay on their lines on devices that showed them shifted since 0.4.0 or 0.6.0, like Samsung fridges and older Fire tablets (#510). `dot_animation: classic` now draws dots exactly as before 0.4.0, inside their line.
