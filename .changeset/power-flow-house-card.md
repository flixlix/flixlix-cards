---
"power-flow-house-card": minor
---

New card: Power Flow House Card draws your live power on an isometric house. Solar panels sit on the roof, the battery on the wall and the grid cable runs to the street; every wire goes through the inverter, and a pulse runs along it in the direction its power flows, faster the more power it carries. Each value hangs next to what it measures, and numbers roll to their new value when a reading changes (turn this off with `animate_numbers: false`).

It takes Power Flow Card Plus' `entities` config (grid, solar, battery with state of charge, home, low-carbon share and power outage), so you can try it by changing a Power Flow Card Plus' `type` to `custom:power-flow-house-card`. Individual devices are not drawn yet.
