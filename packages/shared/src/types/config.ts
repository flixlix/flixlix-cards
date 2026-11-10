import {
  type BaseConfigEntity,
  type ColorValue,
  type DirectionalColors,
  type GridPowerOutage,
  type IndividualDeviceType,
  type LovelaceCardConfig,
  type SecondaryInfoType,
  type SummableSecondaryInfoType,
} from "./type";

/** How a flow's value maps to seconds per dot; see the flow formula docs. */
export const FLOW_RATE_MODELS = ["duration", "speed", "relative"] as const;
export type FlowRateModel = (typeof FLOW_RATE_MODELS)[number];

/** Which wires exist between grid, solar, battery and home; see the topology docs. */
export const TOPOLOGIES = ["standard", "battery_hub", "isolated_battery"] as const;
export type Topology = (typeof TOPOLOGIES)[number];

/** Which node the auxiliary bubble's line runs to; `none` draws no line. */
export const AUXILIARY_CONNECTIONS = ["grid", "battery", "none"] as const;
export type AuxiliaryConnection = (typeof AUXILIARY_CONNECTIONS)[number];

export type DisplayZeroLinesMode = "show" | "grey_out" | "transparency" | "hide" | "custom";

interface mainConfigOptions {
  dashboard_link?: string;
  dashboard_link_label?: string;
  second_dashboard_link?: string;
  second_dashboard_link_label?: string;
  min_flow_rate: number;
  max_flow_rate: number;
  clickable_entities: boolean;
  max_expected_power: number;
  min_expected_power: number;
  flow_rate_model?: FlowRateModel;
  /** Older alias of `flow_rate_model`: `false` is "relative", otherwise "duration". */
  use_new_flow_rate_model?: boolean;
  base_decimals: number;
  kilo_decimals: number;
  kilo_threshold: number;
  mega_decimals: number;
  mega_threshold: number;
  /** Pad values with zeros to the decimals they are rounded to, e.g. `1.0 kW` instead of `1 kW`. */
  keep_trailing_zeros?: boolean;
  full_size?: boolean;
  style_ha_card?: string;
  style_card_content?: string;
  disable_dots?: boolean;
  no_labels?: boolean;
  display_zero_lines?: {
    mode?: DisplayZeroLinesMode;
    transparency?: number;
    grey_color?: string | number[];
    /** Also grey out grid, battery and individual circles while nothing flows through them. */
    grey_out_circles?: boolean;
  };
  sort_individual_devices?: boolean;
  allow_layout_break?: boolean;
  topology?: Topology;
  /* LEGACY - JUST TO AVOID ERRORS */
  w_threshold?: number;
  w_decimals?: number;
  kw_decimals?: number;
  wh_threshold?: number;
  wh_kwh_threshold?: number;
  wh_decimals?: number;
  kwh_decimals?: number;
  mwh_decimals?: number;
}

export interface FlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
}

export interface PowerFlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
}

export interface EnergyFlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
  collection_key?: string;
}

export type IndividualField = IndividualDeviceType[];

interface Battery extends BaseConfigEntity {
  state_of_charge?: string;
  state_of_charge_unit?: string;
  state_of_charge_unit_white_space?: boolean;
  state_of_charge_decimals?: number;
  show_state_of_charge?: boolean;
  display_zero?: boolean;
  color_state_of_charge_value?: "no_color" | "color_dynamically" | "production" | "consumption";
  color_circle?: "color_dynamically" | "production" | "consumption" | "no_color";
  color_value?: boolean;
  color?: DirectionalColors;
}

interface Grid extends BaseConfigEntity {
  power_outage?: GridPowerOutage;
  secondary_info?: SecondaryInfoType;
  display_zero?: boolean;
  color_circle?: "color_dynamically" | "production" | "consumption" | "no_color";
  color_value?: boolean;
  color?: DirectionalColors;
}

interface Solar extends BaseConfigEntity {
  entity: string;
  color?: ColorValue;
  color_icon?: boolean;
  color_value?: boolean;
  color_label?: boolean;
  secondary_info?: SummableSecondaryInfoType;
  display_zero?: boolean;
  display_zero_state?: boolean;
}

interface Home extends BaseConfigEntity {
  entity: string;
  override_state?: boolean;
  color_icon?: boolean | "solar" | "grid" | "battery";
  color_value?: boolean | "solar" | "grid" | "battery";
  subtract_individual?: boolean;
  secondary_info?: SecondaryInfoType;
  circle_animation?: boolean;
  hide?: boolean;
}

interface FossilFuelPercentage extends BaseConfigEntity {
  entity: string;
  color?: string;
  state_type?: "percentage" | "power";
  /** The entity reports the low-carbon share (100 - fossil percentage), e.g. a "green energy %". */
  invert_state?: boolean;
  color_icon?: boolean;
  display_zero?: boolean;
  display_zero_state?: boolean;
  display_zero_tolerance?: number;
  color_value?: boolean;
  color_label?: boolean;
  unit_white_space?: boolean;
  calculate_flow_rate?: boolean | number;
  secondary_info: SecondaryInfoType;
}

/**
 * A display-only node under the grid and left of the battery. Its reading never enters the
 * solver or home consumption.
 */
export type Auxiliary = IndividualDeviceType & { connect_to?: AuxiliaryConnection };

export type ConfigEntities = {
  battery?: Battery;
  grid?: Grid;
  solar?: Solar;
  home?: Home;
  fossil_fuel_percentage?: FossilFuelPercentage;
  individual?: IndividualField;
  auxiliary?: Auxiliary;
  individual1?: IndividualField;
  individual2?: IndividualField;
};

export type ConfigEntity =
  | Battery
  | Grid
  | Solar
  | Home
  | FossilFuelPercentage
  | IndividualDeviceType;
