---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: flow dots no longer depend on screen measurements, which may be what shifts them off their lines on some devices (#510). `dot_animation: classic` now draws dots inside their line's SVG, like before 0.4.0.
