# Home Flow Card

[![ko-fi support](https://img.shields.io/badge/support-me-ff5e5b?style=flat-square&logo=ko-fi)](https://ko-fi.com/flixlix)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=flat-square)](https://github.com/hacs/integration)
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
- **Your car, too.** An optional electric car parks in front of the house, wired to the home's
  outlet, with its power and state of charge on its label. Unplugged it waits faded,
  without its cable; away, it is not drawn at all, on conditions you choose.

Only what you configure is drawn: solar alone, a battery and the grid, or the whole house.
Individual devices are not drawn yet; use [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus)
for those.

## Installation

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=home-flow-card&category=plugin)

This card is in the default catalog. On Home Assistant 2026.11 and newer, go to
**Settings → Marketplace**, search for **Home Flow Card** and install it. Before 2026.11, search for
it in [HACS](https://hacs.xyz) and download it.

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

Every option the card reads, by where it goes in the YAML. Only `type` and one of `grid`, `solar`
or `battery` are required.

### Card options

| Name                 | Type    | Default | Description                                                                                                                                         |
| -------------------- | ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | string  | -       | `custom:home-flow-card`                                                                                                                             |
| `title`              | string  | -       | Card title                                                                                                                                          |
| `grid`               | object  | -       | The grid, see [Grid](#grid)                                                                                                                         |
| `solar`              | object  | -       | Solar on the roof, see [Solar](#solar)                                                                                                              |
| `battery`            | object  | -       | The battery on the wall, see [Battery](#battery)                                                                                                    |
| `home`               | object  | -       | The home's consumption, see [Home](#home). Without it, the card works out what the home uses from the others                                        |
| `generator`          | object  | -       | A generator for grid outages, see [Generator](#generator)                                                                                           |
| `car`                | object  | -       | An electric car in front of the house, see [Car](#car)                                                                                              |
| `animate_numbers`    | boolean | `true`  | Roll each number to its new value when a reading changes. Always still when your system asks for reduced motion                                     |
| `disable_dots`       | boolean | `false` | Keep the wires still: no pulses, only the colour of the power they carry                                                                            |
| `wire_width`         | number  | `1`     | How many times thicker the wires are drawn, for example `2` for twice as thick. Like the labels, they keep a similar size whatever the card's width |
| `clickable_entities` | boolean | `true`  | Tapping a value opens its entity's details; `false` turns that off. A node's own actions run either way                                             |
| `base_decimals`      | number  | `0`     | Decimals of values in W                                                                                                                             |
| `kilo_decimals`      | number  | `1`     | Decimals of values in kW                                                                                                                            |
| `kilo_threshold`     | number  | `1000`  | From how many watts a value is shown in kW                                                                                                          |
| `min_flow_rate`      | number  | `0.75`  | Seconds per pulse at the most power                                                                                                                 |
| `max_flow_rate`      | number  | `6`     | Seconds per pulse at the least power                                                                                                                |
| `min_expected_power` | number  | `0.01`  | Power at which pulses run their slowest, in W                                                                                                       |
| `max_expected_power` | number  | `2000`  | Power at which pulses run their fastest, in W                                                                                                       |

Leave a node out and the house does not draw it. `grid`, `solar`, `battery` and `home` take the
same options as in [Power Flow Card Plus](https://cards.flixlix.com/power-flow-card-plus/configuration);
the tables below list the ones that change the house.

### Grid

| Name                       | Type             | Default        | Description                                                                                                                                      |
| -------------------------- | ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entity`                   | string or object | -              | **Required.** A power sensor, positive while importing and negative while exporting, or `consumption` and `production`, one sensor per direction |
| `entity.consumption`       | string           | -              | The import sensor, positive while importing                                                                                                      |
| `entity.production`        | string           | -              | The export sensor, positive while exporting                                                                                                      |
| `name`                     | string           | `Grid`         | Label name                                                                                                                                       |
| `power_outage`             | object           | -              | Tells the card when the grid is down: its cable goes dead and its label shows an alert                                                           |
| `power_outage.entity`      | string           | -              | **Required** with `power_outage`. The entity that reports an outage                                                                              |
| `power_outage.state_alert` | string           | `on`           | The state of `power_outage.entity` that means the grid is down                                                                                   |
| `power_outage.label_alert` | string           | `Power Outage` | The alert under the grid's name during an outage                                                                                                 |
| `invert_state`             | boolean          | `false`        | Swap import and export, for a sensor that reads the other way round                                                                              |
| `use_metadata`             | boolean          | `false`        | Take the name from the entity                                                                                                                    |
| `display_zero_tolerance`   | number           | `0`            | Below this power, in W, the grid counts as idle                                                                                                  |
| `unit_of_measurement`      | string           | -              | Unit shown instead of the sensor's own                                                                                                           |
| `decimals`                 | number           | -              | Decimals of the value, instead of the card's `base_decimals` and `kilo_decimals`                                                                 |
| `color.consumption`        | string or list   | theme          | Colour of the wire while importing, as `#rrggbb` or `[r, g, b]`                                                                                  |
| `color.production`         | string or list   | theme          | Colour of the wire while exporting                                                                                                               |
| `tap_action`               | object           | -              | What tapping the label does, see [Actions](#actions)                                                                                             |
| `hold_action`              | object           | -              | What holding the label does                                                                                                                      |
| `double_tap_action`        | object           | -              | What double-tapping the label does                                                                                                               |

### Solar

| Name                     | Type           | Default | Description                                          |
| ------------------------ | -------------- | ------- | ---------------------------------------------------- |
| `entity`                 | string         | -       | **Required.** The solar production sensor            |
| `name`                   | string         | `Solar` | Label name                                           |
| `invert_state`           | boolean        | `false` | For a sensor that reads production as negative       |
| `use_metadata`           | boolean        | `false` | Take the name from the entity                        |
| `display_zero_tolerance` | number         | `0`     | Below this power, in W, solar counts as idle         |
| `unit_of_measurement`    | string         | -       | Unit shown instead of the sensor's own               |
| `decimals`               | number         | -       | Decimals of the value, instead of the card's         |
| `color`                  | string or list | theme   | Colour of the wire, as `#rrggbb` or `[r, g, b]`      |
| `tap_action`             | object         | -       | What tapping the label does, see [Actions](#actions) |
| `hold_action`            | object         | -       | What holding the label does                          |
| `double_tap_action`      | object         | -       | What double-tapping the label does                   |

### Battery

| Name                               | Type             | Default       | Description                                                                                                                                                             |
| ---------------------------------- | ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`                           | string or object | -             | **Required.** A power sensor, positive while discharging and negative while charging, or `consumption` and `production`, one per direction                              |
| `entity.consumption`               | string           | -             | The discharge sensor, positive while discharging                                                                                                                        |
| `entity.production`                | string           | -             | The charge sensor, positive while charging                                                                                                                              |
| `state_of_charge`                  | string           | -             | The state of charge sensor, in %. Fills the charge bar and shows on the label                                                                                           |
| `state_of_charge_position`         | string           | `below_power` | Where the label shows the state of charge: `below_power`, `above_power` (swapped with the power), `after_power` or `before_power` (inline)                              |
| `state_of_charge_severity`         | object           | -             | Where the charge bar changes colour, in %                                                                                                                               |
| `state_of_charge_severity.red`     | number           | `15`          | The bar is red below this charge                                                                                                                                        |
| `state_of_charge_severity.yellow`  | number           | `30`          | The bar is yellow below this charge, and green above it                                                                                                                 |
| `state_of_charge_unit`             | string           | `%`           | Unit of the state of charge                                                                                                                                             |
| `state_of_charge_unit_white_space` | boolean          | `true`        | Put a space between the state of charge and its unit                                                                                                                    |
| `state_of_charge_decimals`         | number           | `0`           | Decimals of the state of charge                                                                                                                                         |
| `name`                             | string           | `Battery`     | Label name                                                                                                                                                              |
| `icon`                             | string           | by charge     | The icon on the battery: `mdi:battery`, `mdi:battery-high`, `mdi:battery-medium`, `mdi:battery-low` or `mdi:battery-outline`. By default it follows the state of charge |
| `invert_state`                     | boolean          | `false`       | Swap charging and discharging, for a sensor that reads the other way round                                                                                              |
| `use_metadata`                     | boolean          | `false`       | Take the name and icon from the entity                                                                                                                                  |
| `display_zero_tolerance`           | number           | `0`           | Below this power, in W, the battery counts as idle                                                                                                                      |
| `unit_of_measurement`              | string           | -             | Unit shown instead of the sensor's own                                                                                                                                  |
| `decimals`                         | number           | -             | Decimals of the value, instead of the card's                                                                                                                            |
| `color.consumption`                | string or list   | theme         | Colour of the wire while discharging, as `#rrggbb` or `[r, g, b]`                                                                                                       |
| `color.production`                 | string or list   | theme         | Colour of the wire while charging                                                                                                                                       |
| `tap_action`                       | object           | -             | What tapping the label does, see [Actions](#actions)                                                                                                                    |
| `hold_action`                      | object           | -             | What holding the label does                                                                                                                                             |
| `double_tap_action`                | object           | -             | What double-tapping the label does                                                                                                                                      |

### Home

Without a `home`, the card works out what the home uses from the other nodes.

| Name                  | Type    | Default | Description                                                                      |
| --------------------- | ------- | ------- | -------------------------------------------------------------------------------- |
| `entity`              | string  | -       | The home's consumption sensor, opened on tap and read with `override_state`      |
| `name`                | string  | `Home`  | Label name                                                                       |
| `override_state`      | boolean | `false` | Show the `entity`'s reading instead of the home's consumption the card works out |
| `use_metadata`        | boolean | `false` | Take the name from the entity                                                    |
| `unit_of_measurement` | string  | -       | Unit shown instead of the sensor's own                                           |
| `decimals`            | number  | -       | Decimals of the value, instead of the card's                                     |
| `tap_action`          | object  | -       | What tapping the label does, see [Actions](#actions)                             |
| `hold_action`         | object  | -       | What holding the label does                                                      |
| `double_tap_action`   | object  | -       | What double-tapping the label does                                               |

### Generator

A generator the inverter switches to during a grid outage. It gets its own wire into the inverter
and is never drawn on the grid cable. It needs [`grid.power_outage`](#grid) to know when the grid
is down; while it runs, its label takes the grid's place.

| Name     | Type   | Default     | Description                                |
| -------- | ------ | ----------- | ------------------------------------------ |
| `entity` | string | -           | **Required.** The generator's power sensor |
| `name`   | string | `Generator` | Label name                                 |

### Car

An electric car parked in front of the house, wired to the home's outlet.

| Name              | Type   | Default | Description                                                                                                                                                |
| ----------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`          | string | -       | **Required.** Its charging power, positive while it charges and negative while it feeds the home                                                           |
| `state_of_charge` | string | -       | Its battery level, in %, shown on its label under its power                                                                                                |
| `name`            | string | `Car`   | Label name                                                                                                                                                 |
| `visibility`      | list   | -       | [Conditions](#conditions): the car shows only while all of them hold. While hidden it keeps its room, so the house does not move. Without, it always shows |
| `idle`            | list   | -       | [Conditions](#conditions): while all of them hold, the car is drawn faded and unplugged, without its cable. Without, it is idle while it draws no power    |

#### Conditions

`car.visibility` and `car.idle` take the conditions of a card's visibility tab, and the editor sets
them up the same way:

| `condition`     | Options                                              |
| --------------- | ---------------------------------------------------- |
| `state`         | `entity`, `state` or `state_not` (a value or a list) |
| `numeric_state` | `entity`, `above`, `below`                           |
| `screen`        | `media_query`                                        |
| `user`          | `users` (user ids)                                   |
| `time`          | `after`, `before`, `weekdays`                        |
| `location`      | `locations` (`home`, `not_home` or zones)            |
| `and`, `or`     | `conditions`                                         |
| `not`           | `conditions`, passes unless all of them hold         |

Template, sun, zone and device conditions need Home Assistant itself and are ignored.

### Actions

`tap_action`, `hold_action` and `double_tap_action` take Home Assistant's
[actions](https://www.home-assistant.io/dashboards/actions/): `more-info`, `toggle`, `navigate`,
`url`, `perform-action`, `assist` or `none`. Without any of them, tapping a label opens its
entity's details, unless `clickable_entities: false`.

## Examples

Each recorded from the real card.

### Solar and a battery

The full house: solar, a battery with its state of charge, and the grid.

<img width="478" alt="Solar charging the battery and exporting, then a cloud, then an evening on the battery" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/solar-battery.gif">

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

### Separate sensors, an outage and a generator

One sensor per direction, the grid's outage sensor, and a generator that steps in when the grid
goes down.

<img width="478" alt="The grid goes down, the generator takes over, then the grid comes back" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/outage-generator.gif">

```yaml
type: custom:home-flow-card
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
  entity:
    consumption: sensor.battery_discharge_power
    production: sensor.battery_charge_power
  state_of_charge: sensor.battery_soc
```

### A car charging off the sun

The car shows only while it is home, and waits faded and unplugged while its cable is out.

<img width="478" alt="A car charging from solar, unplugged and faded, then plugged in again" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/car.gif">

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
car:
  entity: sensor.wallbox_power
  state_of_charge: sensor.car_battery_level
  visibility:
    - condition: state
      entity: device_tracker.car
      state: home
  idle:
    - condition: state
      entity: binary_sensor.car_plugged_in
      state: "off"
```

### Your own battery thresholds

Turn the charge bar yellow and red where it matters for your battery.

<img width="478" alt="The battery discharging, its bar turning from green to yellow below 50 % and red below 25 %" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/thresholds.gif">

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
  state_of_charge_severity:
    red: 25
    yellow: 50
```

### Where the state of charge sits

Under the power, swapped with it, or on its line.

<img width="478" alt="The battery's label with each state_of_charge_position: below_power, above_power, after_power and before_power" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/charge-position.gif">

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
  state_of_charge_position: after_power
```

### Grid only

Without solar or a battery, the house shows the grid feeding the home.

<img width="478" alt="The grid feeding the home as its power changes" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/grid-only.gif">

```yaml
type: custom:home-flow-card
grid:
  entity: sensor.grid_power
```

### Thicker wires

Draw the wires twice as thick. They keep that size whatever the card's width.

<img width="478" alt="Solar, a battery and the grid with wires drawn twice as thick" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/wire-width.gif">

```yaml
type: custom:home-flow-card
wire_width: 2
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc
```

### Still numbers and wires

Plain numbers and no pulses, for a calmer dashboard.

<img width="478" alt="Solar and the grid with still wires and numbers that change without rolling" src="https://raw.githubusercontent.com/flixlix/flixlix-cards/main/packages/flixlix-cards/home-flow-card/assets/examples/still.gif">

```yaml
type: custom:home-flow-card
animate_numbers: false
disable_dots: true
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
```

## Source and issues

This card is distributed via [flixlix/home-flow-card](https://github.com/flixlix/home-flow-card);
the source lives in the monorepo [flixlix/flixlix-cards](https://github.com/flixlix/flixlix-cards),
where issues and feature requests are tracked.
