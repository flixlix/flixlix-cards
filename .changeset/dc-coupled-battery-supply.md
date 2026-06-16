---
"power-flow-card-plus": minor
---

Add `force_battery_supply` config option for DC-coupled solar+battery systems where solar exclusively charges the battery and home is powered through the battery/inverter. When enabled, hides Solar→Home, Solar→Grid, and Grid→Home flow lines while keeping Solar→Battery, Battery→Home, and Battery→Grid.
