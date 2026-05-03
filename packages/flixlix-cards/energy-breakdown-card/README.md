# Energy Breakdown Card

<img width="2034" height="697" alt="Demo Image" src="https://github.com/user-attachments/assets/c8fe8f63-9680-4507-bccd-8e792322c165" />

A custom Home Assistant Lovelace card that visualizes how your energy use is broken down across sources. Built to fit the design language of the latest Lovelace UI: rounded corners, soft shadows, HA color tokens, and a quiet visual presence that adapts to your theme.

Supports two visual variants:

- **Donut** — a clean ring chart with optional total in the center
- **Bar** — a stacked progress bar with optional total above

Both variants support an optional **legend** (names + values + percentages) and a **tooltip** that works on touch devices as well as desktop.

## Installation

### HACS (custom repository)

This card is **not yet in the default HACS store** — you need to add it as a custom repository first.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=flixlix&repository=energy-breakdown-card&category=Dashboard)

1. In Home Assistant, open **HACS**.
2. Click the **⋮** menu in the top-right → **Custom repositories**.
3. Add the repository URL `https://github.com/flixlix/energy-breakdown-card` with category **Dashboard**, then click **Add**.
4. Search for **Energy Breakdown Card** in HACS and click **Download**.
5. Reload the dashboard / clear browser cache.

The button above pre-fills steps 2–4 for you if you have [My Home Assistant](https://my.home-assistant.io) set up.

<details>
<summary>Manual install</summary>

1. Download `energy-breakdown-card.js` from the [latest release](https://github.com/flixlix/energy-breakdown-card/releases/latest) and copy it into your `config/www/` directory.
2. Add the resource in **Settings → Dashboards → ⋮ → Resources**:
   - URL: `/local/energy-breakdown-card.js`
   - Type: **JavaScript Module**
3. Reload the dashboard / clear browser cache.

If you configure resources via YAML instead, add to `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/energy-breakdown-card.js
      type: module
```

</details>

## Configuration

```yaml
type: custom:energy-breakdown-card
title: Energy Breakdown
chart_type: bar # or "donut"
legend_position: bottom # or "right"
show_legend: true
show_tooltip: true
show_total: true
show_legend_value: true
show_legend_percentage: true
show_icons: true
sort: true
max_items: 5
group_others: true
section_radius: 8
entities:
  - entity: sensor.solar_energy_today
    name: Solar
    color: "var(--energy-solar-color)"
  - entity: sensor.grid_energy_today
    name: Grid
    color: "#488fc2"
  - entity: sensor.battery_energy_today
    name: Battery
    icon: mdi:home-battery
```

### Options

| Option                   | Type                    | Default       | Description                                                                                                                                     |
| ------------------------ | ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                  | string                  | —             | Card title                                                                                                                                      |
| `chart_type`             | `"bar"` \| `"donut"`    | `"bar"`       | Which visual variant to render                                                                                                                  |
| `entities`               | array                   | required      | Energy sources to display (see below)                                                                                                           |
| `show_legend`            | boolean                 | `true`        | Show the legend with names and values                                                                                                           |
| `legend_position`        | `"bottom"` \| `"right"` | `"bottom"`    | Where to place the legend (donut only — ignored for bar, which always uses bottom)                                                              |
| `show_tooltip`           | boolean                 | `true`        | Show a tooltip on hover/tap of a segment                                                                                                        |
| `show_total`             | boolean                 | `true`        | Show the total in the center (donut) or header (bar)                                                                                            |
| `show_legend_value`      | boolean                 | `true`        | Show the formatted value in each legend row                                                                                                     |
| `show_legend_percentage` | boolean                 | `true`        | Show the percentage in each legend row                                                                                                          |
| `show_icons`             | boolean                 | `true`        | Show entity icons in the legend                                                                                                                 |
| `sort`                   | boolean                 | `true`        | Sort segments by value, descending                                                                                                              |
| `max_items`              | number                  | —             | Show only the top N largest sources                                                                                                             |
| `group_others`           | boolean                 | `true`        | When `max_items` is set, bundle the rest into a single "Other"                                                                                  |
| `decimals`               | number                  | auto          | Decimal places for the formatted value                                                                                                          |
| `unit_of_measurement`    | string                  | inferred      | Fallback unit for entities with no unit attribute                                                                                               |
| `donut_thickness`        | number                  | `22`          | Donut ring thickness in px (donut only)                                                                                                         |
| `bar_thickness`          | number                  | `18`          | Bar height in px (bar only)                                                                                                                     |
| `section_radius`         | number                  | `thickness/2` | Corner radius for sections — donut: caps to half thickness; bar: pixel radius                                                                   |
| `energy_date_selection`  | boolean                 | `false`       | When `true`, values come from the energy dashboard's selected date range (statistics growth). When `false`, the entity's current state is used. |
| `collection_key`         | string                  | —             | Optional non-default energy collection key (e.g. a secondary energy dashboard).                                                                 |

### Entity-level options

| Option                | Type   | Description                                                      |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `entity`              | string | Required. Entity ID                                              |
| `name`                | string | Override the friendly name                                       |
| `color`               | string | CSS color (hex, rgb, or `var(...)`); defaults to a smart palette |
| `icon`                | string | MDI icon                                                         |
| `unit_of_measurement` | string | Override the entity unit                                         |
| `decimals`            | number | Override decimals for this entity                                |
| `multiplier`          | number | Multiply the raw entity state (useful to convert Wh → kWh, etc.) |
| `tap_action`          | object | Action to run on tap (defaults to `more-info`)                   |
| `hold_action`         | object | Action to run on long-press                                      |
| `double_tap_action`   | object | Action to run on double-tap                                      |

## Tooltip behavior

- **Desktop:** hovering a segment opens the tooltip near the cursor; it tracks the cursor and disappears on leave.
- **Mobile:** tapping a segment opens the tooltip and pins it; tapping again on the same segment fires its `tap_action` (or `more-info`); tapping outside dismisses it.
- The tooltip auto-flips horizontally and vertically to stay inside the card.

## Design

The card uses HA's CSS custom properties so it picks up your theme automatically:

- `--card-background-color`, `--ha-card-border-radius`
- `--primary-text-color`, `--secondary-text-color`
- `--secondary-background-color`, `--divider-color`
- Energy palette: `--energy-solar-color`, `--energy-grid-consumption-color`, `--energy-battery-out-color`, `--energy-non-fossil-color`, `--energy-gas-color`, `--energy-water-color`
