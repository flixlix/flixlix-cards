---
"power-flow-card-plus": minor
"energy-flow-card-plus": minor
---

Feat: `accept_negative` on individual devices. When set, an individual entity displays its signed value and preserves the sign through `displayValue`, matching the existing behaviour of `secondary_info.accept_negative`. When unset (default), individual state remains `Math.abs(...)` so no existing dashboard changes behaviour.

Closes flixlix/flixlix-cards#177 for individual entities.
