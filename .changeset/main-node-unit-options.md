---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Fix: `unit_of_measurement`, `unit_white_space` and `decimals` set on grid, solar or battery are now applied to their values. A custom unit shows the reading as is, without converting it to k/M, so the card can show non-electrical flows such as water in L/min.
