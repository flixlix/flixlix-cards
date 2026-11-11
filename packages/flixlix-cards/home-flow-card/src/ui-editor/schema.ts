import localize from "@flixlix-cards/shared/i18n";
import {
  actionSchema,
  customColorsSchema,
  getEntitySeparatedSelectionSchema,
} from "@flixlix-cards/shared/ui-editor/schema/_schema-base";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import {
  DEFAULT_STATE_OF_CHARGE_SEVERITY,
  HEAT_PUMP_STATUSES,
  type HomeFlowMode,
  MODES,
  STATE_OF_CHARGE_POSITIONS,
} from "../types";
import { energyEntities } from "./energy-schema";

const percent = { number: { mode: "box", min: 0, max: 100, step: 1, unit_of_measurement: "%" } };
const decimals = { number: { mode: "box", min: 0, max: 5, step: 1 } };
const seconds = { number: { mode: "box", min: 0, step: 0.05, unit_of_measurement: "s" } };

/** What the sensors read: W live, Wh over a period. */
const baseUnit = (mode: HomeFlowMode | undefined) => (mode === "energy" ? "Wh" : "W");
const amount = (mode: HomeFlowMode | undefined) => ({
  number: { mode: "box", min: 0, step: 1, unit_of_measurement: baseUnit(mode) },
});

const entity = { name: "entity", selector: { entity: {} } } as const;
const name = { name: "name", selector: { text: {} } } as const;
const actions = {
  type: "expandable",
  title: localize("editor.action"),
  name: "",
  schema: actionSchema,
} as const;

/** How a node's reading is read and shown; the same for every node with a reading. */
const readingFields = (mode: HomeFlowMode | undefined) =>
  [
    { name: "invert_state", selector: { boolean: {} } },
    { name: "use_metadata", selector: { boolean: {} } },
    { name: "display_zero_tolerance", selector: amount(mode) },
    { name: "unit_of_measurement", selector: { text: {} } },
    { name: "decimals", selector: decimals },
  ] as const;

const powerOutage = {
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
} as const;

/** Everything a node rarely needs, folded away under its main fields. */
const more = <const Fields, const Extra extends readonly unknown[]>(fields: Fields, extra: Extra) =>
  ({
    type: "expandable",
    title: localize("editor.more"),
    icon: "mdi:tune-variant",
    name: "",
    schema: [{ type: "grid", name: "", schema: fields }, ...extra],
  }) as const;

const batteryFields = [
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
  { type: "grid", name: "", schema: [name, { name: "icon", selector: { icon: {} } }] },
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
] as const;

const heatPumpFields = [
  entity,
  { name: "climate", selector: { entity: { domain: "climate" } } },
  {
    name: "status",
    translation_key: "heat_pump_status",
    selector: {
      select: {
        mode: "dropdown",
        options: HEAT_PUMP_STATUSES.map((status) => ({
          value: status,
          label: localize(`editor.heat_pump_status_${status}`),
        })),
      },
    },
  },
  name,
] as const;

const homeFields = [
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
] as const;

/**
 * Only the fields this card reads, the entity first; the rest under "More options". A live
 * outage says nothing about energy over a period, so energy mode leaves it out.
 */
export const nodeSchemas = (mode: HomeFlowMode | undefined) => ({
  grid: [
    entity,
    getEntitySeparatedSelectionSchema(),
    name,
    ...(mode === "energy" ? [] : [powerOutage]),
    more(readingFields(mode), [customColorsSchema, actions]),
  ],
  solar: [
    entity,
    name,
    more(readingFields(mode), [{ name: "color", selector: { color_rgb: {} } }, actions]),
  ],
  battery: [
    entity,
    getEntitySeparatedSelectionSchema(),
    ...batteryFields,
    more(
      [
        ...readingFields(mode),
        { name: "state_of_charge_unit", selector: { text: {} } },
        { name: "state_of_charge_decimals", selector: decimals },
      ],
      [customColorsSchema, actions]
    ),
  ],
  generator: [entity, name],
  car: [entity, { name: "state_of_charge", selector: { entity: {} } }, name],
  heat_pump: heatPumpFields,
  home: homeFields,
});

const modeField = {
  name: "mode",
  selector: {
    select: {
      mode: "dropdown",
      options: MODES.map((mode) => ({ value: mode, label: localize(`editor.mode_${mode}`) })),
    },
  },
} as const;

/** The title and what the sensors measure; the date picker to follow only for energy. */
export const generalSchema = (mode: HomeFlowMode | undefined) =>
  [
    { name: "title", selector: { text: {} } },
    modeField,
    ...(mode === "energy"
      ? [{ name: "collection_key", selector: { text: {} } }]
      : [energyEntities]),
  ] as const;

/** Only energy mode has a grid or battery with a value each way. */
const appearance = (mode: HomeFlowMode | undefined) =>
  ({
    type: "expandable",
    title: localize("editor.appearance"),
    icon: "mdi:palette-outline",
    expanded: true,
    name: "",
    schema: [
      {
        name: "wire_width",
        selector: {
          number: { mode: "slider", min: 0.5, max: 4, step: 0.25, unit_of_measurement: "×" },
        },
      },
      ...(mode === "energy"
        ? [
            {
              name: "two_way_value_size",
              selector: {
                number: { mode: "slider", min: 0.5, max: 1, step: 0.05, unit_of_measurement: "×" },
              },
            },
          ]
        : []),
    ],
  }) as const;

const interaction = {
  type: "expandable",
  title: localize("editor.interaction"),
  icon: "mdi:gesture-tap",
  name: "",
  schema: [{ name: "clickable_entities", selector: { boolean: {} } }],
} as const;

/**
 * The expected range is in the card's unit; over a period without one, the pulses share out what
 * was supplied.
 */
const animation = (mode: HomeFlowMode | undefined) =>
  ({
    type: "expandable",
    title: localize("editor.animation"),
    icon: "mdi:animation-play",
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
          { name: "min_expected_value", selector: amount(mode) },
          { name: "max_expected_value", selector: amount(mode) },
        ],
      },
    ],
  }) as const;

const numberFormat = (mode: HomeFlowMode | undefined) =>
  ({
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
          { name: "kilo_threshold", selector: amount(mode) },
          { name: "mega_decimals", selector: decimals },
          { name: "mega_threshold", selector: amount(mode) },
        ],
      },
    ],
  }) as const;

/** Everything but the title and the nodes, grouped by what it changes. */
export const advancedSchema = (mode: HomeFlowMode | undefined) =>
  [appearance(mode), animation(mode), numberFormat(mode), interaction] as const;

/** Over a period, an empty expected range has the pulses share out what was supplied. */
const expectedValueDefaults = (mode: HomeFlowMode | undefined) =>
  mode === "energy"
    ? {
        min_expected_value: localize("editor.relative_to_total"),
        max_expected_value: localize("editor.relative_to_total"),
      }
    : {
        min_expected_value: `${defaultValues.minExpectedPower} W`,
        max_expected_value: `${defaultValues.maxExpectedPower} W`,
      };

/** What an empty field falls back to, shown under it. */
export const fieldDefaults = (mode: HomeFlowMode | undefined): Record<string, string> => ({
  min_flow_rate: `${defaultValues.minFlowRate} s`,
  max_flow_rate: `${defaultValues.maxFlowRate} s`,
  ...expectedValueDefaults(mode),
  base_decimals: String(defaultValues.baseDecimals),
  kilo_decimals: String(defaultValues.kiloDecimals),
  kilo_threshold: `${defaultValues.kiloThreshold} ${baseUnit(mode)}`,
  mega_decimals: "2",
  mega_threshold: `${defaultValues.megaThreshold} ${baseUnit(mode)}`,
  red: `${DEFAULT_STATE_OF_CHARGE_SEVERITY.red} %`,
  yellow: `${DEFAULT_STATE_OF_CHARGE_SEVERITY.yellow} %`,
  state_alert: "on",
  wire_width: "1×",
  two_way_value_size: "1×",
  state_of_charge_position: localize("editor.state_of_charge_position_below_value"),
  status: localize("editor.heat_pump_status_state"),
  mode: localize("editor.mode_power"),
});
