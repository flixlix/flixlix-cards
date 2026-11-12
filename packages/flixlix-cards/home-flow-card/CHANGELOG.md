# home-flow-card

## 0.3.3-beta.1

### Patch Changes

- **Fix:** Conditions set up in Home Assistant 2026.10's editor work again: the car's `visibility` and `idle`, and a device's `visibility`. Zone, sun, template and device conditions now count too, instead of always holding. ([#528](https://github.com/flixlix/flixlix-cards/pull/528))

- **Fix:** An editor page's title is translated by its own card, so the home flow card's heat pump page no longer reads `editor.heat_pump` when an older power or energy flow card loads first. ([#527](https://github.com/flixlix/flixlix-cards/pull/527))

- **Fix:** A configured heat pump no longer makes the house smaller. Its label hangs in the room left of the house, so the card keeps its size and height on cards about 500px and wider; narrow cards shrink less than before. ([#526](https://github.com/flixlix/flixlix-cards/pull/526))

- **Fix:** A location condition set up in Home Assistant 2026.11's editor, by zone, area, floor or label, with `match_mode` or `away`, works instead of breaking the card. ([#529](https://github.com/flixlix/flixlix-cards/pull/529))

## 0.3.3-beta.0

### Patch Changes

- **Fix:** An individual or auxiliary device with `accept_negative` shows a net meter that ran backwards over the selected period as a negative value with its arrow and dots reversed, instead of 0 Wh. ([#521](https://github.com/flixlix/flixlix-cards/pull/521))

- **Fix:** An individual or auxiliary device's secondary info shows its energy meter over the selected period instead of the meter's lifetime total. ([#521](https://github.com/flixlix/flixlix-cards/pull/521))

- **New:** The house can show energy over the dashboard's period instead of live power with `mode: energy`, following its energy date picker or another one picked with `collection_key`. A grid or battery that ran both ways gets a parallel line each way. ([#505](https://github.com/flixlix/flixlix-cards/pull/505))

- **New:** `min_expected_value` and `max_expected_value` set the pulses in both modes, in Wh in energy mode, and `state_of_charge_position` takes `below_value` and the like. The older `_power` names still work; the visual editor saves the new ones. ([#505](https://github.com/flixlix/flixlix-cards/pull/505))

- **Fix:** An idle car without a state of charge is drawn on its own, without a dash and a leader line pointing at it. ([#505](https://github.com/flixlix/flixlix-cards/pull/505))

- **New:** `mega_threshold` and `mega_decimals` are documented and in the visual editor, for totals shown in MW or MWh. ([#505](https://github.com/flixlix/flixlix-cards/pull/505))

- **New:** `two_way_value_size` draws the two values of a grid or battery that ran both ways in energy mode smaller, for example `0.8`, so they take less room. It is in the visual editor's appearance section. ([#505](https://github.com/flixlix/flixlix-cards/pull/505))

- **New:** The house gets a selector in its corner to switch between live power and a period's energy (today, yesterday, week, month or year), set with `views` and `energy_entities`, without a date picker on the dashboard. ([#511](https://github.com/flixlix/flixlix-cards/pull/511))

- **Fix:** Negative values switch to kW, kWh, MW or MWh past the same thresholds as positive ones, so -1200 W shows as -1.2 kW. ([#521](https://github.com/flixlix/flixlix-cards/pull/521))

- **New:** A card added from the card picker starts with the grid, solar, battery and devices from your energy dashboard, and guesses the rest from entity names more carefully than before. ([#524](https://github.com/flixlix/flixlix-cards/pull/524))

## 0.3.2

### Patch Changes

- **Fix:** The help button in the card editor opens the card's configuration page on cards.flixlix.com instead of an old GitHub README. ([#488](https://github.com/flixlix/flixlix-cards/pull/488))

## 0.3.1

### Patch Changes

- **Fix:** Flow dots keep gliding when an entity updates instead of stepping back in Chrome; a new speed now takes over from where each dot is. ([#482](https://github.com/flixlix/flixlix-cards/pull/482))

- **Fix:** The home circle keeps its ring when the home uses nothing. With a home total of 0 the ring had no segments and disappeared; it is now a full ring in the grid color, as it was before the last release. ([#477](https://github.com/flixlix/flixlix-cards/pull/477))

- **Fix:** With `grey_out_circles`, a circle that went grey while idle takes its colour back when power returns, instead of staying grey until the page reloads. ([#487](https://github.com/flixlix/flixlix-cards/pull/487))

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
