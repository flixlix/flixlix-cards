---
"home-flow-card": patch
---

The Home Flow Card can now show an electric car. Add a `car` with the entity of its charging power, and optionally its `state_of_charge` and a `name`, or set it up on the editor's new Car page. The car parks in front of the house, its wire runs from the home's outlet, and its label shows its power and battery level. A car that feeds the home (negative power) sends its power back to the outlet.

Two condition lists, in the format of a card's visibility tab, decide how the car shows. `visibility` hides it unless its conditions hold, for example while it is away; the card keeps its size, so the house does not move. `idle` draws it faded and unplugged, with its battery level as its value; without `idle` conditions the car is idle while it draws no power. Both are set up on the Car page with the same condition editor as the visibility tab, no YAML needed. Entity state, numeric state, screen, user, time, location, and, or and not are checked; template, sun, zone and device conditions need Home Assistant itself and are ignored.
