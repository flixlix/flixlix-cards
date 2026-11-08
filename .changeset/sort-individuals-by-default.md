---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Individual devices are now sorted by their value, largest first, when `sort_individual_devices` is not set, as the documentation has always said. Until now an unset option left them in config order. Devices are compared in watts (or watt-hours), so a `3.8 kW` charger now ranks above a `20 W` light.

If you have not set this option, your devices may move to a different slot, and on a card that shows only some of them, a different set may be visible. To keep your configured order, add `sort_individual_devices: false` to the card.
