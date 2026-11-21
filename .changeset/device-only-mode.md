---
"power-flow-card-plus": minor
---

Power Flow Card Plus can now run without a grid, solar or battery entity. With only individual devices, and optionally a `home` entity, the home sits in the middle and **every** device is shown on a ring around it, instead of the four slots. Circles shrink as devices are added, and a second ring takes over on crowded cards.

- The home shows the `home` entity's reading, or the net consumption of the devices when there is none. A device that feeds power into the home (`accept_negative`) is taken off, and an unavailable `home` entity shows as unavailable.
- `show_direction` draws an arrow along each device's line, pointing towards the home for a feeding device.
- In this mode `display_zero` defaults to `true`: devices at 0 W stay visible. Set `display_zero: false` on a device to hide it while it is idle.
- In the visual editor, grid, solar, battery and fossil fuel can be turned off with a Disable button, and clearing an entity picker now really removes the entity instead of leaving an empty one that still counted as configured.
- Fix: a card that Home Assistant moves to another column when the dashboard is resized now keeps tracking its width, so its lines and devices no longer go stale.
- Cards with a grid, solar or battery entity are otherwise unchanged. Energy Flow Card Plus and Home Flow Card still require one of them.
