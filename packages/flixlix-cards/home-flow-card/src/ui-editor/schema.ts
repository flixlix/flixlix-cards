import localize from "@flixlix-cards/shared/i18n";
import {
  actionSchema,
  customColorsSchema,
  getEntitySeparatedSelectionSchema,
} from "@flixlix-cards/shared/ui-editor/schema/_schema-base";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { DEFAULT_STATE_OF_CHARGE_SEVERITY, STATE_OF_CHARGE_POSITIONS } from "../types";

const percent = { number: { mode: "box", min: 0, max: 100, step: 1, unit_of_measurement: "%" } };
const decimals = { number: { mode: "box", min: 0, max: 5, step: 1 } };
const seconds = { number: { mode: "box", min: 0, step: 0.05, unit_of_measurement: "s" } };
const watts = { number: { mode: "box", min: 0, step: 1, unit_of_measurement: "W" } };

const entity = { name: "entity", selector: { entity: {} } } as const;
const name = { name: "name", selector: { text: {} } } as const;
const actions = {
  type: "expandable",
  title: localize("editor.action"),
  name: "",
  schema: actionSchema,
} as const;

/** How a node's reading is read and shown; the same for every node with power. */
const readingFields = [
  { name: "invert_state", selector: { boolean: {} } },
  { name: "use_metadata", selector: { boolean: {} } },
  { name: "display_zero_tolerance", selector: watts },
  { name: "unit_of_measurement", selector: { text: {} } },
  { name: "decimals", selector: decimals },
] as const;

/** Everything a node rarely needs, folded away under its main fields. */
const more = <const Fields, const Extra extends readonly unknown[]>(fields: Fields, extra: Extra) =>
  ({
    type: "expandable",
    title: localize("editor.more"),
    icon: "mdi:tune-variant",
    name: "",
    schema: [{ type: "grid", name: "", schema: fields }, ...extra],
  }) as const;

/** Only the fields this card reads, the entity first; the rest under "More options". */
export const NODE_SCHEMAS = {
  grid: [
    entity,
    getEntitySeparatedSelectionSchema(),
    name,
    {
      type: "expandable",
      title: localize("editor.power_outage"),
      name: "power_outage",
      icon: "mdi:transmission-tower-off",
      schema: [
        {
          type: "grid",
          name: "",
          schema: [
            { name: "entity", selector: { entity: {} } },
            { name: "state_alert", selector: { text: {} } },
            { name: "label_alert", selector: { text: {} } },
          ],
        },
      ],
    },
    more(readingFields, [customColorsSchema, actions]),
  ],
  solar: [
    entity,
    name,
    more(readingFields, [{ name: "color", selector: { color_rgb: {} } }, actions]),
  ],
  battery: [
    entity,
    getEntitySeparatedSelectionSchema(),
    { name: "state_of_charge", selector: { entity: {} } },
    {
      name: "state_of_charge_position",
      selector: {
        select: {
          mode: "dropdown",
          options: STATE_OF_CHARGE_POSITIONS.map((position) => ({
            value: position,
            label: localize(`editor.state_of_charge_position_${position}`),
          })),
        },
      },
    },
    {
      type: "grid",
      name: "",
      schema: [name, { name: "icon", selector: { icon: {} } }],
    },
    {
      type: "expandable",
      name: "state_of_charge_severity",
      title: localize("editor.state_of_charge_severity"),
      icon: "mdi:battery-heart-variant",
      schema: [
        {
          type: "grid",
          name: "",
          schema: [
            { name: "red", selector: percent },
            { name: "yellow", selector: percent },
          ],
        },
      ],
    },
    more(
      [
        ...readingFields,
        { name: "state_of_charge_unit", selector: { text: {} } },
        { name: "state_of_charge_decimals", selector: decimals },
      ],
      [customColorsSchema, actions]
    ),
  ],
  generator: [entity, name],
  car: [entity, { name: "state_of_charge", selector: { entity: {} } }, name],
  home: [
    entity,
    name,
    more(
      [
        { name: "override_state", selector: { boolean: {} } },
        { name: "use_metadata", selector: { boolean: {} } },
        { name: "unit_of_measurement", selector: { text: {} } },
        { name: "decimals", selector: decimals },
      ],
      [actions]
    ),
  ],
} as const;

/**
 * The car's conditions as YAML, should Home Assistant's own conditions editor not be there: it
 * is defined while a dashboard is being edited, but it is not a public API.
 */
export const CAR_CONDITIONS_AS_YAML = [
  { name: "visibility", selector: { object: {} } },
  { name: "idle", selector: { object: {} } },
] as const;

export const generalSchema = [{ name: "title", selector: { text: {} } }] as const;

/** Everything but the title and the nodes, grouped by what it changes. */
export const advancedSchema = [
  {
    type: "expandable",
    title: localize("editor.animation"),
    icon: "mdi:animation-play",
    expanded: true,
    name: "",
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "animate_numbers", selector: { boolean: {} } },
          { name: "disable_dots", selector: { boolean: {} } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "min_flow_rate", selector: seconds },
          { name: "max_flow_rate", selector: seconds },
          { name: "min_expected_power", selector: watts },
          { name: "max_expected_power", selector: watts },
        ],
      },
    ],
  },
  {
    type: "expandable",
    title: localize("editor.number_format"),
    icon: "mdi:decimal",
    name: "",
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "base_decimals", selector: decimals },
          { name: "kilo_decimals", selector: decimals },
          { name: "kilo_threshold", selector: watts },
        ],
      },
    ],
  },
  {
    type: "expandable",
    title: localize("editor.interaction"),
    icon: "mdi:gesture-tap",
    name: "",
    schema: [{ name: "clickable_entities", selector: { boolean: {} } }],
  },
] as const;

/** What an empty field falls back to, shown under it. */
export const FIELD_DEFAULTS: Record<string, string> = {
  min_flow_rate: `${defaultValues.minFlowRate} s`,
  max_flow_rate: `${defaultValues.maxFlowRate} s`,
  min_expected_power: `${defaultValues.minExpectedPower} W`,
  max_expected_power: `${defaultValues.maxExpectedPower} W`,
  base_decimals: String(defaultValues.baseDecimals),
  kilo_decimals: String(defaultValues.kiloDecimals),
  kilo_threshold: `${defaultValues.kiloThreshold} W`,
  red: `${DEFAULT_STATE_OF_CHARGE_SEVERITY.red} %`,
  yellow: `${DEFAULT_STATE_OF_CHARGE_SEVERITY.yellow} %`,
  state_alert: "on",
  state_of_charge_position: localize("editor.state_of_charge_position_below_power"),
};
