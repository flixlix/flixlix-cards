# home-flow-card

## 0.3.0

### Minor Changes

- **New:** A `heat_pump` on the front wall, wired to the home's outlet. Its label shows its power and its state or temperature from its `climate` entity, which a tap opens. It hangs above a configured car, lower without one; the car's wire now rises beside the outlet. ([#476](https://github.com/flixlix/flixlix-cards/pull/476))

### Patch Changes

- **Docs:** Home Flow Card is now in the default HACS catalog. Search for it in Settings → Marketplace (or in HACS before 2026.11) instead of adding it as a custom repository. ([#470](https://github.com/flixlix/flixlix-cards/pull/470))

- **Fix:** Short labels such as "0 W Solar" are easier to tap on mobile: every clickable label now takes taps from an area at least 48px wide and tall. ([#463](https://github.com/flixlix/flixlix-cards/pull/463))

- **Performance:** The card file is 2 to 5% smaller. Cards are now built with Vite+ instead of Rollup and Babel; they still run on the same browsers, including Chromecast and older tablets. ([#471](https://github.com/flixlix/flixlix-cards/pull/471))

## 0.2.0

### Minor Changes

- **New:** New `wire_width` option draws the wires thicker (`wire_width: 2` doubles them), also in the editor under Appearance. Wires now keep a similar size on narrow and wide cards. ([#455](https://github.com/flixlix/flixlix-cards/pull/455))

### Patch Changes

- **Fix:** Entities are clickable again when the config has no `clickable_entities` line, as before 0.4.0, and now also on Home Flow Card. Only `clickable_entities: false` turns it off. ([#459](https://github.com/flixlix/flixlix-cards/pull/459))

- **Docs:** The README and docs list every option of every node, with the battery's state of charge options under Battery, and each example comes with a recording of the card it draws. ([#456](https://github.com/flixlix/flixlix-cards/pull/456))

## 0.1.4

### Patch Changes

- [#450](https://github.com/flixlix/flixlix-cards/pull/450) [`4109729`](https://github.com/flixlix/flixlix-cards/commit/4109729a5050eb6829a24e3645aa7fb41cd31cd0) Thanks [@flixlix](https://github.com/flixlix)! - The battery's label can place its state of charge where you want it with `battery.state_of_charge_position`: under the power as before (`below_power`, the default), swapped with the power so the charge is the large value (`above_power`), or on the power's own line, after it (`after_power`) or before it (`before_power`). It is also in the battery page of the UI editor.

- [#450](https://github.com/flixlix/flixlix-cards/pull/450) [`38057fd`](https://github.com/flixlix/flixlix-cards/commit/38057fd99f78e395e1fe1b863d137ba2c4fd3661) Thanks [@flixlix](https://github.com/flixlix)! - The labels keep a readable size on narrow cards, such as in a sidebar or on a phone, and stop growing on wide ones. Names and the status line stay between 12 and 19 px, and values between about 21 and 34 px; the house makes room for them. Cards between about 450 and 700 px wide look as before.

## 0.1.3

### Patch Changes

- [#446](https://github.com/flixlix/flixlix-cards/pull/446) [`e7f784e`](https://github.com/flixlix/flixlix-cards/commit/e7f784ea5c545594effe25dbc517b7d6b261ba1c) Thanks [@flixlix](https://github.com/flixlix)! - A node whose entity was cleared in the visual editor is no longer drawn. Clearing the field leaves an empty entity (`entity: ""`) in the config, and solar and the grid still showed it with a value of 0; now a node is drawn only with a real entity, as the battery already was.

- [#446](https://github.com/flixlix/flixlix-cards/pull/446) [`8e95383`](https://github.com/flixlix/flixlix-cards/commit/8e953834d89d195371f7897489054772b29f36db) Thanks [@flixlix](https://github.com/flixlix)! - The Home Flow Card can now show an electric car. Add a `car` with the entity of its charging power, and optionally its `state_of_charge` and a `name`, or set it up on the editor's new Car page. The car parks in front of the house, its wire runs from the home's outlet, and its label shows its power and battery level. A car that feeds the home (negative power) sends its power back to the outlet.

  Two condition lists, in the format of a card's visibility tab, decide how the car shows. `visibility` hides it unless its conditions hold, for example while it is away; the card keeps its size, so the house does not move. `idle` draws it faded and unplugged, with its battery level as its value; without `idle` conditions the car is idle while it draws no power. Both are set up on the Car page with the same condition editor as the visibility tab, no YAML needed. Entity state, numeric state, screen, user, time, location, and, or and not are checked; template, sun, zone and device conditions need Home Assistant itself and are ignored.

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
