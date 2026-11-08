# home-flow-card

## 0.1.2

### Patch Changes

- Labels have their full size as soon as the dashboard opens. Home Assistant takes cards out and puts them back while a dashboard loads, and the card stopped watching its width on the way: its labels stayed small until a sensor changed.
- Units only slide when their number changes, not when the dashboard opens.

## 0.1.1

### Patch Changes

- The grid has a label again, whenever the generator isn't drawn: its import or export, pointing at the grid cable out past the battery. During an outage it shows a dash and the outage alert (`grid.power_outage.label_alert`, default "Power Outage"); with a generator running, the generator's label takes its place.
- The editor's grid page has its `name` and `label_alert` fields back.

## 0.1.0

### Minor Changes

- First release: Home Flow Card draws your live power on an isometric house. Solar panels sit on the roof, the battery on the wall and the grid cable runs off along the ground, and every wire goes through the inverter.
- A pulse runs along each wire in the direction its power flows, faster and longer the more power it carries.
- Each value hangs next to what it measures; the grid has none, as its cable carries the flow. Numbers roll to their new value and units slide along with them when a reading changes (turn this off with `animate_numbers: false`).
- `grid` (with power outage), `solar`, `battery` (with state of charge) and `home` take Power Flow Card Plus' options, at the top level of the card instead of under `entities`. Individual devices are not drawn yet.
- The battery's icon follows its state of charge, as in Power Flow Card Plus, and its charge bar turns yellow and red below thresholds you set with `battery.state_of_charge_severity` (default: red below 15 %, yellow below 30 %). Under its value, the battery shows its state of charge and whether it is charging or discharging.
- During a grid outage the grid cable goes dead and an optional `generator`, wired to the inverter and never to the grid cable, appears and carries the generator's power.
- A visual editor with a page per node and an Advanced page.
