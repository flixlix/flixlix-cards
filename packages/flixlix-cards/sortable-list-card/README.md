# Sortable List Card

A generic drag-and-drop **reorderable list** for Home Assistant. Drag rows or use the
up/down arrows to reorder, and the new order is persisted by calling **any service** you
configure. Items can be plain config entries or backed by entities (pulling their name,
icon and state automatically).

A HEMS (Home Energy Management System) load-priority list is just one use case — see the
example at the bottom.

## Features

- Drag-and-drop reordering with a live drop indicator
- Up/down arrow buttons (disabled at the boundaries)
- Persist the order through **any service call** with `{value}` placeholders
- Optional read-back entity so external changes are reflected; optimistic updates keep the
  UI responsive while the entity catches up
- Entity-backed items (name / icon / state) with manual overrides
- Full visual editor (UI editor) — no YAML required
- Written in TypeScript with Lit

## Configuration

| Name           | Type    | Default | Description                                                                |
| -------------- | ------- | ------- | -------------------------------------------------------------------------- |
| `type`         | string  | —       | `custom:sortable-list-card`                                                |
| `items`        | list    | —       | **Required.** The list items (see below)                                   |
| `entity`       | string  | —       | Entity whose state holds the current order (read-back source). Optional    |
| `value_format` | string  | `csv`   | How the order is stored/parsed: `csv` or `json`                            |
| `save_action`  | object  | —       | Service to call on reorder. Defaults to `input_text.set_value` on `entity` |
| `title`        | string  | —       | Card header                                                                |
| `show_handle`  | boolean | `true`  | Show the drag handle                                                       |
| `show_arrows`  | boolean | `true`  | Show the up/down arrow buttons                                             |
| `show_rank`    | boolean | `true`  | Show the numeric rank                                                      |
| `show_state`   | boolean | `false` | Show the entity state as secondary text (entity-backed items)              |

### Item options

| Name     | Type   | Default              | Description                                        |
| -------- | ------ | -------------------- | -------------------------------------------------- |
| `key`    | string | the item's `entity`  | Stable id stored in the order                      |
| `entity` | string | —                    | Entity to pull `friendly_name` / icon / state from |
| `name`   | string | entity name or `key` | Friendly label override                            |
| `icon`   | string | entity icon          | `mdi:` icon override                               |

Each item needs at least a `key` **or** an `entity`.

### Save action & placeholders

`save_action.data` and `save_action.target` support these placeholders, substituted with the
new order on every reorder:

| Placeholder    | Replaced with                                                 |
| -------------- | ------------------------------------------------------------- |
| `{value}`      | the order formatted per `value_format` (csv or json string)   |
| `{value_csv}`  | comma-separated keys, e.g. `a,b,c`                            |
| `{value_json}` | JSON array string, e.g. `["a","b","c"]`                       |
| `{value_list}` | the raw array (use when the string is exactly `{value_list}`) |

## Examples

### Generic — store as a CSV `input_text`

```yaml
type: custom:sortable-list-card
title: My order
entity: input_text.my_order
items:
  - key: alpha
    name: Alpha
  - key: beta
    name: Beta
  - key: gamma
    name: Gamma
```

### Entity-backed items + a custom script

```yaml
type: custom:sortable-list-card
title: Rooms
show_state: true
value_format: json
entity: input_text.room_order
save_action:
  service: script.save_room_order
  data:
    order: "{value_list}"
items:
  - entity: light.kitchen
  - entity: light.living_room
  - entity: light.bedroom
```

### HEMS load priority (the original use case)

```yaml
type: custom:sortable-list-card
title: Load priority
entity: input_text.hems_priority
items:
  - key: battery
    name: Battery
    icon: mdi:battery-charging
  - key: ev
    name: EV charger
    icon: mdi:car-electric
  - key: heating
    name: Heating
    icon: mdi:radiator
```

With a matching helper:

```yaml
input_text:
  hems_priority:
    name: HEMS Priority
    max: 255
    initial: battery,ev,heating
```
