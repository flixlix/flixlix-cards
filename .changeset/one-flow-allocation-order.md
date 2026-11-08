---
"power-flow-card-plus": minor
"energy-flow-card-plus": minor
---

Flows are now worked out the same way on both cards, in the order the Home Assistant energy dashboard uses, so the same readings always draw the same lines. Flows never go negative and never carry more than a source produces or a sink takes: for example, solar can no longer appear to export more than it generates. When the grid is hidden or during a power outage, solar and battery flows are recalculated instead of losing the part that went to the grid, and Energy Flow Card Plus now shows battery flows during an outage too. With a home entity using `override_state`, the card still shows its reading, while the lines and the home circle stay balanced.

Power Flow Card Plus readings whose flows change:

| Readings                                                                              | Before                                                                        | Now                                                                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Import 200 W, export 600 W, solar 500 W, battery discharging 150 W and charging 200 W | Solar → grid 600 W, grid → battery 200 W, battery → grid 0 W, grid → home 0 W | Solar → grid 450 W, solar → battery 50 W, grid → battery 150 W, battery → grid 150 W, grid → home 50 W |
| Grid/battery exchange below the larger of the grid and battery zero tolerances        | Dropped                                                                       | Shown unless below the node's own tolerance                                                            |
| Outage with the battery charging                                                      | Grid → battery from the live grid reading                                     | Grid → battery from the generator                                                                      |
