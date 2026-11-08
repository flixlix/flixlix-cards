---
"power-flow-card-plus": minor
---

Power Flow Card Plus no longer needs a grid, solar or battery entity. With only individual devices (and optionally a `home` entity), the card shows the home in the middle and the devices around it. The home shows the `home` entity's reading, even without `override_state`, or the sum of the shown devices when there is no home entity. With no source to split the home between, its circle gets a plain border instead of coloured segments. Configs with a grid, solar or battery entity behave exactly as before. Energy Flow Card Plus and Home Flow Card still require one of those entities.
