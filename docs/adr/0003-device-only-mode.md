# 3. With no source the card shows every device on an orbit and the home is measured

Status: accepted

## Context

Power Flow Card Plus derived the home from its sources, so a card with only individual devices had
nothing to show: the home read 0 W and only four devices fit in the slots around it.

## Decision

A card with no grid, solar or battery entity is in **device-only mode**. It is decided once, from
the config, and passed down as `deviceOnly` on the card state input.

- **Layout:** the home sits in the middle and every device is placed on an **orbit**, one or two
  rings around it. Circles shrink and a second ring is added until no circle, name or line touches
  another. The slots and their four-device limit do not apply.
- **Home:** nothing balances to it, so its value is measured: the `home` entity's reading, or the
  net consumption of the shown devices (a feeding device, `accept_negative` and below zero, is
  taken off, never below 0). A configured but unavailable `home` entity reads as unavailable and
  is not replaced by the device sum, which would pass for the sensor's own reading.
- **`display_zero`** defaults to `true` for individual devices in this mode, and stays `false`
  otherwise. With no slots to save there is no reason to hide an idle device, and a device that
  appears and disappears would make the others move around the orbit. `display_zero: false`
  still hides a device while it is idle.

## Consequences

- Cards with a grid, solar or battery entity are unchanged.
- `display_zero` now has a default that depends on the mode. Once released it is hard to undo,
  because configs written for the mode rely on idle devices being shown.
- Energy Flow Card Plus and Home Flow Card still require a source.
