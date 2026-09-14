---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

Resolve field names through `hass.formatEntityName` so they follow Home Assistant's registry-based naming instead of `friendly_name`. A field's `name` now also accepts a structured name, letting you compose it from the entity, device, area or floor. Requires Home Assistant 2026.4; older versions keep the previous behaviour.
