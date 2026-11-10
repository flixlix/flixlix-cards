import localize from "@flixlix-cards/shared/i18n";
import { displayZeroLinesSchema } from "@flixlix-cards/shared/ui-editor/schema/display-zero-lines";
import { FLOW_RATE_MODELS, TOPOLOGIES } from "@flixlix-cards/shared/types";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assign,
  boolean,
  enums,
  integer,
  number,
  object,
  optional,
  string,
} from "superstruct";

const baseLovelaceCardConfig = object({
  type: string(),
  view_layout: any(),
  layout_options: any(),
  grid_options: any(),
  visibility: any(),
  disabled: optional(boolean()),
});

export const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    theme: optional(string()),
    // Legacy: no longer in the editor, which offers to convert them to `buttons`.
    dashboard_link: optional(string()),
    dashboard_link_label: optional(string()),
    second_dashboard_link: optional(string()),
    second_dashboard_link_label: optional(string()),
    buttons: optional(
      array(
        object({
          name: optional(string()),
          icon: optional(string()),
          entity: optional(string()),
          tap_action: optional(any()),
          hold_action: optional(any()),
          double_tap_action: optional(any()),
        })
      )
    ),
    inverted_entities: optional(any()),
    base_decimals: optional(integer()),
    kilo_decimals: optional(integer()),
    mega_decimals: optional(integer()),
    mega_threshold: optional(number()),
    min_flow_rate: optional(number()),
    max_flow_rate: optional(number()),
    min_expected_power: optional(number()),
    max_expected_power: optional(number()),
    kilo_threshold: optional(number()),
    clickable_entities: optional(boolean()),
    transparency_zero_lines: optional(number()),
    greyout_zero_lines: optional(boolean()),
    display_zero_lines: optional(any()),
    flow_rate_model: optional(enums([...FLOW_RATE_MODELS])),
    use_new_flow_rate_model: optional(boolean()),
    full_size: optional(boolean()),
    style_ha_card: optional(any()),
    style_card_content: optional(any()),
    disable_dots: optional(boolean()),
    no_labels: optional(boolean()),
    keep_trailing_zeros: optional(boolean()),
    entities: object({
      battery: optional(any()),
      grid: optional(any()),
      solar: optional(any()),
      home: optional(any()),
      fossil_fuel_percentage: optional(any()),
      individual: optional(any()),
      auxiliary: optional(any()),
      individual1: optional(any()),
      individual2: optional(any()),
    }),
    sort_individual_devices: optional(boolean()),
    allow_layout_break: optional(boolean()),
    topology: optional(enums([...TOPOLOGIES])),

    /* LEGACY - JUST TO AVOID ERRORS */
    watt_threshold: optional(number()),
    w_decimals: optional(number()),
    kw_decimals: optional(number()),
  })
);

export const generalConfigSchema = [
  {
    name: "title",
    label: "Title",
    selector: { text: {} },
  },
] as const;

const advancedFieldsGrid = () => ({
  type: "grid",
  column_min_width: "200px",
  schema: [
    {
      name: "flow_rate_model",
      selector: {
        select: {
          mode: "dropdown",
          options: FLOW_RATE_MODELS.map((model) => ({
            value: model,
            label: localize(`editor.flow_rate_model_${model}`),
          })),
        },
      },
    },
    {
      name: "topology",
      label: localize("editor.topology"),
      selector: {
        select: {
          mode: "dropdown",
          options: TOPOLOGIES.map((topology) => ({
            value: topology,
            label: localize(`editor.topology_${topology}`),
          })),
        },
      },
    },
    {
      name: "base_decimals",
      label: "Watt Decimals",
      selector: { number: { mode: "box", min: 0, max: 5, step: 1 } },
    },
    {
      name: "kilo_decimals",
      label: "kW Decimals",
      selector: { number: { mode: "box", min: 0, max: 5, step: 1 } },
    },
    {
      name: "mega_decimals",
      label: "MW Decimals",
      selector: { number: { mode: "box", min: 0, max: 5, step: 1 } },
    },
    {
      name: "max_flow_rate",
      label: "Max Flow Rate (Sec/Dot)",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 0.01 } },
    },
    {
      name: "min_flow_rate",
      label: "Min Flow Rate (Sec/Dot)",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 0.01 } },
    },
    {
      name: "max_expected_power",
      label: "Max Expected Power (in Watts)",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 0.01 } },
    },
    {
      name: "min_expected_power",
      label: "Min Expected Power (in Watts)",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 0.01 } },
    },
    {
      name: "kilo_threshold",
      label: "Kilowatt Threshold",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 1 } },
    },
    {
      name: "mega_threshold",
      label: "Megawatt Threshold",
      selector: { number: { mode: "box", min: 0, max: 10000000, step: 1 } },
    },
  ],
});

const advancedTogglesGrid = () => ({
  type: "grid",
  column_min_width: "200px",
  schema: [
    {
      name: "clickable_entities",
      label: "Clickable Entities",
      selector: { boolean: {} },
      default: true,
    },
    {
      name: "disable_dots",
      label: "Disable Moving Dots",
      selector: { boolean: {} },
    },
    {
      name: "no_labels",
      label: localize("editor.no_labels"),
      selector: { boolean: {} },
    },
    {
      name: "keep_trailing_zeros",
      label: localize("editor.keep_trailing_zeros"),
      selector: { boolean: {} },
    },
    {
      name: "sort_individual_devices",
      label: "Sort individual devices by usage",
      selector: { boolean: {} },
      default: true,
    },
    {
      name: "allow_layout_break",
      label: "Allow Layout Break",
      selector: { boolean: {} },
    },
  ],
});

export const advancedOptionsSchema = memoizeOne((displayZeroLinesMode: string) => [
  advancedFieldsGrid(),
  advancedTogglesGrid(),
  {
    type: "expandable",
    title: localize("editor.display_zero_lines"),
    schema: [...displayZeroLinesSchema(displayZeroLinesMode)],
  },
]);
