# Power Pulse Card

[![ko-fi support](https://img.shields.io/badge/support-me-ff5e5b?style=flat-square&logo=ko-fi)](https://ko-fi.com/flixlix)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=flat-square)](https://github.com/hacs/integration)

> [!NOTE]
> This card is the source of `power-pulse-card.js`. The source code lives in
> the monorepo at [flixlix/flixlix-cards](https://github.com/flixlix/flixlix-cards).
> Issues and feature requests are tracked there.

A modern take on the Power Flow Card. The home node sits in the center, power
sources fan in from the top, and individual devices fan out at the bottom.
Flows are animated with smoothly-spaced pill segments whose speed and gap
react to the underlying power, and number transitions slide between values
instead of snapping.

## Differences from `power-flow-card-plus`

If you're coming from
[Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus),
here's what's intentionally different:

- **Home node is in the center.** Sources are above, devices are below.
- **Multiple solar arrays and multiple batteries** are first-class.
  Each gets its own bubble, its own value, its own flow line.
- **Configurable individual devices** below the home node. They use the same
  schema as the legacy `individual` field but are rendered as a fan of curved
  flow lines from the home.
- **Pill-shaped flow segments**, not dots. Width and length are independently
  configurable.
- **Smooth animated numbers** — values slide between digits like
  [number-flow](https://github.com/barvian/number-flow), built in with no
  extra runtime dependency.
- **Smart layout** — when there isn't enough space for every bubble in a row,
  the gap shrinks first, and only then the lowest-power items are dropped.
  Items keep their original config order.
- **Auto-fade on inactivity** — when power drops below the activity threshold,
  the flow line and its rail fade out asymmetrically (fast hide, slow reveal)
  rather than persisting as a flat decoration.
- **Track rails** — each flow has a faint static gray curve underneath it so
  the eye has something stable to follow when several flows fan out from the
  home node simultaneously.

## Installation

### HACS (recommended)

This card is available through [HACS](https://hacs.xyz). After installing
HACS, search for "Power Pulse Card" and install via the UI.

<details>
<summary>Manual install</summary>

1. Download `power-pulse-card.js` from the
   [latest release](https://github.com/flixlix/flixlix-cards/releases/latest)
   into your `config/www` directory.

2. Add a resource reference. If you configure dashboards via YAML:

   ```yaml
   resources:
     - url: /local/power-pulse-card.js
       type: module
   ```

   Or via the graphical editor:
   1. Make sure advanced mode is enabled in your user profile.
   2. Navigate to **Settings → Dashboards**.
   3. Click the three-dot menu and choose **Resources**.
   4. Click **+ Add resource**.
   5. Enter URL `/local/power-pulse-card.js` and select **JavaScript Module**
      (use `/hacsfiles/power-pulse-card/power-pulse-card.js` if installed
      via HACS and HACS didn't add it automatically).

</details>

## Usage

> [!WARNING]
> The card has many configuration options, but you can ignore most of them. A
> minimal configuration just needs entities for grid, solar, or batteries.
> Everything else is optional. See [Minimal Configuration](#minimal-configuration).

### Card options

| Name                   | Type     |   Default    | Description                                                                                                                                                                                                                |
| ---------------------- | -------- | :----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                 | `string` | **required** | Must be `custom:power-pulse-card`.                                                                                                                                                                                         |
| `entities`             | `object` | **required** | At least one of `grid`, `solars`, or `batteries` must be set. See [Entities object](#entities-object).                                                                                                                     |
| `title`                | `string` |              | Title shown at the top of the card.                                                                                                                                                                                        |
| `max_expected_power`   | `number` |    `5000`    | The power (in W) at which the flow animation reaches its fastest speed and tightest pill spacing. Above this value the flow is clamped to its maximum visual intensity.                                                    |
| `min_expected_power`   | `number` |     `5`      | The power (in W) below which a flow is considered idle. Below this value the flow line fades out completely (smoothly), so unused paths don't add visual noise.                                                            |
| `kilo_threshold`       | `number` |    `1000`    | Watt threshold at which the value display switches from `W` to `kW`.                                                                                                                                                       |
| `base_decimals`        | `number` |     `0`      | Number of decimals shown for values displayed in `W`.                                                                                                                                                                      |
| `kilo_decimals`        | `number` |     `1`      | Number of decimals shown for values displayed in `kW`.                                                                                                                                                                     |
| `number_transition_ms` | `number` |    `600`     | Duration (ms) of the digit slide animation when a value changes.                                                                                                                                                           |
| `dot_size`             | `number` |     `4`      | Width of each animated pill (px). This is the SVG `stroke-width` of the flow path.                                                                                                                                         |
| `dot_length`           | `number` |     `14`     | Length of each animated pill (px) along the flow direction.                                                                                                                                                                |
| `max_devices`          | `number` |              | Hard cap on how many device bubbles render at once. When more devices are configured than this, the highest-power ones are kept and the rest are hidden. The Devices section of the editor exposes this as a number input. |
| `gauges`               | `object` |              | Optional summary gauges flanking the home bubble. See [Gauges](#gauges).                                                                                                                                                   |

### Entities object

At least one of `grid`, `solars`, or `batteries` is required. All entities
should have a `unit_of_measurement` of `W` or `kW` (or `MW`, `GW`, etc. — the
card auto-converts to watts internally).

| Name        | Type     | Description                                                                                      |
| ----------- | :------- | ------------------------------------------------------------------------------------------------ |
| `grid`      | `object` | Single grid bubble. See [Grid configuration](#grid-configuration).                               |
| `solars`    | `array`  | One or more solar arrays. See [Solar configuration](#solar-configuration).                       |
| `batteries` | `array`  | One or more home batteries. See [Battery configuration](#battery-configuration).                 |
| `home`      | `object` | Home bubble. Optional — auto-computed by default. See [Home configuration](#home-configuration). |
| `devices`   | `array`  | Individual devices below the home. See [Devices configuration](#devices-configuration).          |

### Grid configuration

| Name                | Type                 | Default                  | Description                                                                                                                                                                                         |
| ------------------- | -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`            | `string` or `object` | **required**             | Either a single sensor (positive = consumption from grid, negative = production back to grid) or an object of split sensors `{ consumption, production }`. See [Split entities](#split-entities).   |
| `name`              | `string`             | `Grid`                   | Display name. Currently used by the editor's secondary label only — no labels are rendered under bubbles on the card itself.                                                                        |
| `icon`              | `string`             | `mdi:transmission-tower` | MDI icon shown inside the bubble.                                                                                                                                                                   |
| `color`             | `object`             |                          | Object with `consumption` and `production` keys. Each accepts an HA palette name (`primary`, `accent`, `red`, `deep-orange`, …), a hex color, or any valid CSS color string. See [Colors](#colors). |
| `tap_action`        | `object`             |                          | Standard HA action config triggered on tap/click. Defaults to `more-info` for the consumption entity.                                                                                               |
| `hold_action`       | `object`             |                          | Standard HA action config triggered on long press.                                                                                                                                                  |
| `double_tap_action` | `object`             |                          | Standard HA action config triggered on double tap.                                                                                                                                                  |

### Solar configuration

The `solars` field is an **array** — even when you only have a single solar
array, configure it as a one-element array. Each entry produces its own
bubble at the top of the card with its own animated flow line into the home.
The card auto-allocates each array's contribution to home consumption based
on the share of total solar production.

| Name                | Type     | Default             | Description                                                                                                                               |
| ------------------- | -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`            | `string` | **required**        | Sensor providing the solar production for this array. Negative values are clamped to zero.                                                |
| `name`              | `string` | `Solar`             | Used by the editor's secondary label.                                                                                                     |
| `icon`              | `string` | `mdi:weather-sunny` | MDI icon shown inside the bubble.                                                                                                         |
| `color`             | `string` |                     | Color for this solar array's bubble border, value, and flow line. Accepts an HA palette name, a hex color, or any valid CSS color string. |
| `tap_action`        | `object` |                     | Standard HA action config triggered on tap/click.                                                                                         |
| `hold_action`       | `object` |                     | Standard HA action config triggered on long press.                                                                                        |
| `double_tap_action` | `object` |                     | Standard HA action config triggered on double tap.                                                                                        |

### Battery configuration

The `batteries` field is an **array** — even with a single battery, configure
it as a one-element array. Each entry produces its own bubble with a
state-of-charge ring, and its flow line animates upward when charging or
downward when discharging.

| Name                   | Type                 | Default                                       | Description                                                                                                                                                                          |
| ---------------------- | -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entity`               | `string` or `object` | **required**                                  | Either a single sensor (positive = discharging, negative = charging) or an object of split sensors `{ consumption, production }`. See [Split entities](#split-entities).             |
| `state_of_charge`      | `string`             |                                               | Sensor providing the SoC in percent (`0`–`100`). When set, drives the colored progress ring around the bubble and the percentage shown inside.                                       |
| `show_state_of_charge` | `boolean`            | `true`                                        | When `false`, hides only the percentage shown beneath the icon. The colored SoC ring around the bubble still tracks the charge level.                                                |
| `name`                 | `string`             | `Battery` or `Battery N`                      | Used by the editor's secondary label.                                                                                                                                                |
| `icon`                 | `string`             | `mdi:battery` (auto-adjusts to the SoC level) | MDI icon shown inside the bubble. When omitted, the card picks one of `mdi:battery`, `battery-high`, `battery-medium`, `battery-low`, or `battery-outline` based on the current SoC. |
| `color`                | `object`             |                                               | Object with `in` (charging) and `out` (discharging) keys. Each accepts an HA palette name, a hex color, or any valid CSS color string. See [Colors](#colors).                        |
| `tap_action`           | `object`             |                                               | Standard HA action config triggered on tap/click.                                                                                                                                    |
| `hold_action`          | `object`             |                                               | Standard HA action config triggered on long press.                                                                                                                                   |
| `double_tap_action`    | `object`             |                                               | Standard HA action config triggered on double tap.                                                                                                                                   |

### Home configuration

The home bubble sits in the center of the card. Its value is rendered
_inside_ the bubble (no label) and reflects the auto-computed total
consumption: `(solar + grid_in + battery_out) − grid_out − battery_in`.

The home configuration object is entirely optional — if you omit it, the
home bubble still renders with sensible defaults.

| Name                | Type      | Default                                              | Description                                                                                                                                                                                                                                                               |
| ------------------- | --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`            | `string`  |                                                      | Optional sensor used as the source for the more-info dialog when the home is tapped, and as the displayed value when `override_state` is `true`. Not used in the flow calculations.                                                                                       |
| `override_state`    | `boolean` | `false`                                              | When `true` and `entity` is set, the value rendered inside the home bubble is read directly from that entity instead of being derived from the sources. The flow line widths and pill animations still use the sources-derived total — only the displayed number changes. |
| `name`              | `string`  | `Home`                                               | Used by the editor's secondary label.                                                                                                                                                                                                                                     |
| `icon`              | `string`  | `mdi:home-variant-outline`                           | MDI icon shown inside the bubble.                                                                                                                                                                                                                                         |
| `color`             | `string`  | `--secondary-text-color` (dark gray, theme-adaptive) | Border / accent color. Accepts an HA palette name, a hex color, or any valid CSS color string.                                                                                                                                                                            |
| `tap_action`        | `object`  |                                                      | Standard HA action config triggered on tap/click.                                                                                                                                                                                                                         |
| `hold_action`       | `object`  |                                                      | Standard HA action config triggered on long press.                                                                                                                                                                                                                        |
| `double_tap_action` | `object`  |                                                      | Standard HA action config triggered on double tap.                                                                                                                                                                                                                        |

### Devices configuration

Each device gets its own bubble below the home node, with its value rendered
underneath. The flow line curves out from the bottom of the home bubble into
the top of the device bubble. Each device's power is read directly from its
sensor (positive values only — negative values are clamped to zero).

| Name                | Type     | Default              | Description                                                                                    |
| ------------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `entity`            | `string` | **required**         | Sensor providing the device's instantaneous power consumption.                                 |
| `name`              | `string` | entity friendly_name | Used by the editor's secondary label.                                                          |
| `icon`              | `string` | `mdi:flash-outline`  | MDI icon shown inside the bubble.                                                              |
| `color`             | `string` | secondary text color | Border / accent color. Accepts an HA palette name, a hex color, or any valid CSS color string. |
| `tap_action`        | `object` |                      | Standard HA action config triggered on tap/click.                                              |
| `hold_action`       | `object` |                      | Standard HA action config triggered on long press.                                             |
| `double_tap_action` | `object` |                      | Standard HA action config triggered on double tap.                                             |

When the row of devices doesn't fit the card width, the card first compresses
the gap between bubbles, and then — if still too tight — drops devices
starting from the lowest current power. Items keep their original
configuration order; only the lowest-power ones disappear when space is
critical.

### Gauges

Two optional summary gauges that sit on either side of the home bubble. They
fill the whitespace flanking the home node with at-a-glance metrics computed
entirely from the flows you've already configured — no extra entities
needed. Both default to `false`.

```yaml
gauges:
  self_consumption: true
  autarky: true
```

| Name               | Type      | Default | Description                                                                                                                                                                                 |
| ------------------ | --------- | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `self_consumption` | `boolean` | `false` | Percentage of solar production that's used at home (rest exported to grid). Computed as `solar_to_home / total_solar`. Renders 0 % when no solar is producing.                              |
| `autarky`          | `boolean` | `false` | Percentage of home consumption sourced from non-grid sources (solar + battery). Computed as `(solar_to_home + battery_to_home) / total_home`. Renders 0 % when there's no home consumption. |

Each gauge is a small 270° arc with rounded line caps, the percentage in the
center, and a label below. Self-consumption uses the solar accent color,
autarky uses the success color. The gauges only render when their toggle is
on; with both off, the home bubble sits centered as before.

### Split entities

Used by `grid` and `batteries`. Pass an object instead of a string when your
HA setup has separate sensors for each direction:

| Name          | Type     | Description                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------- |
| `consumption` | `string` | Sensor for grid import / battery discharge. Required for the consumption side to render. |
| `production`  | `string` | Sensor for grid export / battery charging. Required for the production side to render.   |

Either field can be omitted if you only track one direction. When using a
single combined sensor, just pass it as a string: positive values are treated
as consumption (or discharging for batteries), negative values as production
(or charging).

### Colors

Wherever a color field appears (`color` on solar/home/device,
`color.consumption` / `color.production` on grid, `color.in` / `color.out` on
battery), the card accepts:

- An HA palette name: `primary`, `accent`, `red`, `pink`, `purple`,
  `deep-purple`, `indigo`, `blue`, `light-blue`, `cyan`, `teal`, `green`,
  `light-green`, `lime`, `yellow`, `amber`, `orange`, `deep-orange`, `brown`,
  `light-grey`, `grey`, `dark-grey`, `blue-grey`, `black`, `white`,
  `disabled`. The card resolves these to the matching theme variable
  (`var(--deep-orange-color)` etc.) with a hex fallback for themes that don't
  define the variable.
- A hex color (`#ff6f22`).
- Any valid CSS color string (`rgb()`, `hsl()`, `var(...)`, `currentColor`).
- The literal `"default"` or an empty string falls back to the card's
  default for that role.

### Action configuration

Each clickable bubble (sources, batteries, home, devices, plus the home
itself) accepts the standard Home Assistant action configs:

| Name                | Type     | Description              |
| ------------------- | -------- | ------------------------ |
| `tap_action`        | `object` | Triggered on tap/click.  |
| `hold_action`       | `object` | Triggered on long press. |
| `double_tap_action` | `object` | Triggered on double tap. |

If no actions are configured, the card falls back to opening more-info on
the underlying entity when the bubble is tapped.

## Minimal configuration

> Don't forget to change the entity IDs.

### Only grid

```yaml
type: custom:power-pulse-card
entities:
  grid:
    entity: sensor.grid_power
```

### Grid and solar

```yaml
type: custom:power-pulse-card
entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
  solars:
    - entity: sensor.solar_production
```

### Grid, solar, and battery

```yaml
type: custom:power-pulse-card
entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
  solars:
    - entity: sensor.solar_production
  batteries:
    - entity:
        consumption: sensor.battery_discharge
        production: sensor.battery_charge
      state_of_charge: sensor.battery_state_of_charge
```

### Multiple solar arrays and multiple batteries

```yaml
type: custom:power-pulse-card
entities:
  grid:
    entity: sensor.grid_power
  solars:
    - entity: sensor.solar_east
      name: East roof
      icon: mdi:solar-panel
      color: amber
    - entity: sensor.solar_west
      name: West roof
      icon: mdi:solar-panel
      color: orange
  batteries:
    - entity: sensor.battery_1_power
      state_of_charge: sensor.battery_1_soc
      name: Garage
    - entity: sensor.battery_2_power
      state_of_charge: sensor.battery_2_soc
      name: Cellar
```

### Full configuration

```yaml
type: custom:power-pulse-card
title: Power flow
max_expected_power: 5000
min_expected_power: 5
kilo_threshold: 1000
base_decimals: 0
kilo_decimals: 1
number_transition_ms: 600
dot_size: 4
dot_length: 14
entities:
  grid:
    entity:
      consumption: sensor.grid_consumption
      production: sensor.grid_production
    name: Grid
    icon: mdi:transmission-tower
    color:
      consumption: blue
      production: green
    tap_action:
      action: more-info
  solars:
    - entity: sensor.solar_production
      name: Solar
      icon: mdi:weather-sunny
      color: deep-orange
  batteries:
    - entity:
        consumption: sensor.battery_discharge
        production: sensor.battery_charge
      state_of_charge: sensor.battery_state_of_charge
      name: Battery
      color:
        in: light-green
        out: green
  home:
    entity: sensor.home_consumption
    icon: mdi:home-variant-outline
    color: green
  devices:
    - entity: sensor.car_charger_power
      name: Car
      icon: mdi:car-electric
      color: light-blue
    - entity: sensor.heat_pump_power
      name: Heat pump
      icon: mdi:heat-pump
      color: orange
    - entity: sensor.kitchen_power
      name: Kitchen
      icon: mdi:silverware-fork-knife
```

## How the flow looks

The flow line for each source/device is:

- A curved cubic-bezier path that exits straight down from the source bubble,
  curves toward the home, and re-straightens as it enters the top of the home
  bubble (or the symmetric path going the other way for devices).
- Painted underneath with a faint static gray "rail" so multiple fanned-out
  flows still feel organized.
- Dashed with rounded **pills** instead of dots — the pill is configurable in
  width (`dot_size`) and length (`dot_length`).
- Animated by sliding the dash offset along the curve. The speed (px/s) and
  the gap between pills are derived from the current power, both tweened
  smoothly toward their targets so transitions feel continuous rather than
  stepped.
- Faded out (smoothly) when the flow's power drops below `min_expected_power`
  and faded back in (more slowly) when it returns.

## Roadmap

The card is intentionally narrower in scope than `power-flow-card-plus` —
it tries to do the basic power-flow visualization well rather than expose
every possible knob. A few directions that may show up:

- Per-flow line dimming/highlighting on hover.
- Optional "secondary info" string under each value (the way
  `power-flow-card-plus` exposes it).
- Optional layout breakpoints for very narrow cards.

Contributions and feature requests are welcome on the
[main repo](https://github.com/flixlix/flixlix-cards).
