# Home Flow Card

[![ko-fi support](https://img.shields.io/badge/support-me-ff5e5b?style=flat-square&logo=ko-fi)](https://ko-fi.com/flixlix)
[![HACS custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=flat-square)](https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=Dashboard)
![GitHub release](https://img.shields.io/github/v/release/flixlix/home-flow-card?style=flat-square)
![GitHub total downloads](https://img.shields.io/github/downloads/flixlix/home-flow-card/total?style=flat-square)

**Your own little isometric home in Home Assistant, with your live power flowing through it.**

<img width="498" alt="Home Flow Card through a day: a sunny afternoon charging the battery, an evening on the battery, and a grid outage with the generator taking over" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/home-flow-card.gif">

Solar sits on the roof, the battery on the wall and the grid runs off to the street, every wire
meeting at the inverter. One look tells you where your power comes from and where it goes.

> [!TIP]
> 📖 **[Documentation](https://cards.flixlix.com/home-flow-card)** · 🎮 **[Try it live in the playground](https://cards.flixlix.com/home-flow-card/playground)**, no install needed

## Why a house?

- **Reads at a glance.** You know where your power comes from before you read a single number.
- **Motion that means something.** A pulse runs along every wire in the direction its power flows,
  faster and longer the more it carries. Numbers roll to their new value, units slide along, and
  "charging" becomes "discharging" by growing only the letters that change.
- **Made for your dashboard.** Monotone greys from your theme, light and dark, with colour only where
  power flows. It scales to any card width, and the visual editor sets it up without YAML.
- **Ready for the bad days.** When the grid fails, its cable goes dead and its label says so. An
  optional generator appears, wired to the inverter and never to the grid, and its label takes the
  grid's place. A nearly empty battery turns its charge bar yellow, then red, at thresholds you
  choose.

Only what you configure is drawn: solar alone, a battery and the grid, or the whole house.
Individual devices are not drawn yet; use [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus)
for those.

## Installation

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=Dashboard)

Or in HACS, open **⋮ → Custom repositories**, add `https://github.com/flixlix/home-flow-card` with
category **Dashboard**, and download **Home Flow Card**.

To install manually, copy `home-flow-card.js` from the
[latest release](https://github.com/flixlix/home-flow-card/releases/latest) into `config/www/` and
add it as a dashboard resource (`/local/home-flow-card.js`, type `module`).

## Set up in a minute

Point it at the sensors you already have; leave one out and the house doesn't draw it.

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
```

**Already using Power Flow Card Plus?** Home Flow Card reads the same sensors and its nodes take the
same options. Change the `type` and move `grid`, `solar`, `battery` and `home` out of `entities` to
the top level. Options that only change Power Flow Card Plus' circles and lines (for example
`display_zero_lines`) have no effect here.

## Configuration

| Name                               | Type    | Default                   | Description                                                                                                                                         |
| ---------------------------------- | ------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                             | string  | —                         | `custom:home-flow-card`                                                                                                                             |
| `grid`, `solar`, `battery`, `home` | object  | —                         | Each node, configured as in [Power Flow Card Plus](https://cards.flixlix.com/power-flow-card-plus/configuration); leave one out and it is not drawn |
| `title`                            | string  | —                         | Card title                                                                                                                                          |
| `animate_numbers`                  | boolean | `true`                    | Roll each number to its new value when a reading changes. Always still when your system asks for reduced motion                                     |
| `clickable_entities`               | boolean | `false`                   | Tapping a value opens its entity, or runs the node's tap/hold actions                                                                               |
| `disable_dots`                     | boolean | `false`                   | Keep the wires still: no pulses, only the colour of the power they carry                                                                            |
| `battery.state_of_charge_severity` | object  | `{ red: 15, yellow: 30 }` | Battery charge bar colours, in %: red below `red`, yellow below `yellow`, green above both                                                          |
| `generator`                        | object  | —                         | `entity` (and optional `name`) of a generator the inverter switches to during a grid outage; needs `grid.power_outage`                              |
| `base_decimals`                    | number  | `0`                       | Decimals of values in W                                                                                                                             |
| `kilo_decimals`                    | number  | `1`                       | Decimals of values in kW                                                                                                                            |
| `kilo_threshold`                   | number  | `1000`                    | From how many watts a value is shown in kW                                                                                                          |
| `min_flow_rate`                    | number  | `0.75`                    | Seconds per pulse at the most power                                                                                                                 |
| `max_flow_rate`                    | number  | `6`                       | Seconds per pulse at the least power                                                                                                                |
| `max_expected_power`               | number  | `2000`                    | Power at which pulses run their fastest                                                                                                             |

## Examples

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
```

```yaml
type: custom:home-flow-card
animate_numbers: false
grid:
  entity:
    consumption: sensor.grid_import_power
    production: sensor.grid_export_power
  power_outage:
    entity: binary_sensor.grid_outage
generator:
  entity: sensor.generator_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
  state_of_charge_severity:
    red: 10
    yellow: 25
```

## Source and issues

This card is distributed via [flixlix/home-flow-card](https://github.com/flixlix/home-flow-card);
the source lives in the monorepo [flixlix/flixlix-cards](https://github.com/flixlix/flixlix-cards),
where issues and feature requests are tracked.
