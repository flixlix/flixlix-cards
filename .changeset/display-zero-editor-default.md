---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

The UI editor no longer shows "Display Zero" switched on for individual devices and the non-fossil node when the option is not set. The card hides those nodes at zero unless `display_zero: true` is set, and the editor now shows the toggle off to match. The non-fossil documentation now gives the default as `false`.
