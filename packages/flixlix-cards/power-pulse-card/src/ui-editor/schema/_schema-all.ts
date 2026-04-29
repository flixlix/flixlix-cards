import { any, array, assign, boolean, number, object, optional, string } from "superstruct";

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
    max_expected_power: optional(number()),
    min_expected_power: optional(number()),
    kilo_threshold: optional(number()),
    base_decimals: optional(number()),
    kilo_decimals: optional(number()),
    number_transition_ms: optional(number()),
    dot_size: optional(number()),
    dot_length: optional(number()),
    max_devices: optional(number()),
    gauges: optional(any()),
    entities: object({
      grid: optional(any()),
      solars: optional(array(any())),
      batteries: optional(array(any())),
      home: optional(any()),
      devices: optional(array(any())),
    }),
  })
);

export const generalSchema = [{ name: "title", label: "Title", selector: { text: {} } }] as const;

export const advancedSchema = [
  {
    type: "grid",
    name: "",
    column_min_width: "180px",
    schema: [
      {
        name: "max_expected_power",
        label: "Max expected power (W)",
        selector: { number: { min: 100, max: 100000, step: 100, mode: "box" } },
      },
      {
        name: "min_expected_power",
        label: "Min expected power (W)",
        selector: { number: { min: 0, max: 1000, step: 1, mode: "box" } },
      },
      {
        name: "kilo_threshold",
        label: "Kilo threshold (W)",
        selector: { number: { min: 100, max: 100000, step: 100, mode: "box" } },
      },
      {
        name: "base_decimals",
        label: "Decimals (W)",
        selector: { number: { min: 0, max: 4, step: 1, mode: "box" } },
      },
      {
        name: "kilo_decimals",
        label: "Decimals (kW)",
        selector: { number: { min: 0, max: 4, step: 1, mode: "box" } },
      },
      {
        name: "number_transition_ms",
        label: "Number transition (ms)",
        selector: { number: { min: 0, max: 5000, step: 50, mode: "box" } },
      },
      {
        name: "dot_size",
        label: "Pill width (px)",
        selector: { number: { min: 2, max: 24, step: 1, mode: "box" } },
      },
      {
        name: "dot_length",
        label: "Pill length (px)",
        selector: { number: { min: 2, max: 80, step: 1, mode: "box" } },
      },
    ],
  },
] as const;
