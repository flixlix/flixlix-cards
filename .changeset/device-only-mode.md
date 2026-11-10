---
"power-flow-card-plus": minor
---

Power Flow Card Plus no longer needs a grid, solar or battery entity. With none of them, the card runs in device-only mode: the home sits in the middle and **every** individual device is shown on a ring around it (a second ring takes over for crowded cards), with no limit of four. Circles shrink as devices are added, and each device keeps its own colour.

- The home shows the `home` entity's reading, even without `override_state`, or the sum of the devices when there is no home entity. Its circle gets a plain border instead of coloured segments.
- Devices at 0 W stay shown in this mode (there are no slots to save); set `display_zero: false` on a device to hide it while idle.
- The visual editor can disable grid, solar, battery and fossil fuel: each page has a Disable button, and clearing an entity picker now really removes the entity (it used to leave an empty one behind that still counted as configured). With all of them disabled, the editor explains the mode.
- Configs with a grid, solar or battery entity are unchanged. Energy Flow Card Plus and Home Flow Card still require one of those entities.
