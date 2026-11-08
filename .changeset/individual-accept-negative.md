---
"power-flow-card-plus": minor
"energy-flow-card-plus": minor
---

New `accept_negative` option on individual devices. With it, a negative reading means the device feeds power to the home (e.g. an EV discharging with V2G): the value keeps its minus sign and the dots and direction arrow flip. Without it, nothing changes: the sign is dropped as before.
