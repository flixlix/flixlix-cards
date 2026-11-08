---
"power-flow-house-card": minor
---

New card: Power Flow House Card draws your live power on an isometric house. Solar panels sit on the roof, the battery on the wall and the grid cable runs off along the ground; every wire goes through the inverter, and a pulse runs along it in the direction its power flows, faster and longer the more power it carries. Each value hangs next to what it measures, and numbers roll to their new value when a reading changes (turn this off with `animate_numbers: false`).

It takes Power Flow Card Plus' `entities` config (grid with power outage, solar, battery with state of charge, home), so you can try it by changing a Power Flow Card Plus' `type` to `custom:power-flow-house-card`. Individual devices are not drawn yet.

The battery's icon follows its state of charge, as in Power Flow Card Plus, and its charge bar turns yellow and red below thresholds you set with the battery's `state_of_charge_severity` (default: red below 15 %, yellow below 30 %). Under the battery's value, its state of charge and whether it is charging or discharging are spelled out.
