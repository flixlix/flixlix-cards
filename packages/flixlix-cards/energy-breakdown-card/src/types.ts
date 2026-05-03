import { type ActionConfig, type LovelaceCardConfig } from "custom-card-helpers";

export type EnergyBreakdownChartType = "bar" | "donut";

export type EnergyBreakdownEntityConfig = {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  unit_of_measurement?: string;
  decimals?: number;
  multiplier?: number;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

export type EnergyBreakdownLegendPosition = "bottom" | "right";

export type EnergyBreakdownCardConfig = LovelaceCardConfig & {
  type: string;
  title?: string;
  chart_type?: EnergyBreakdownChartType;
  entities: EnergyBreakdownEntityConfig[];
  show_legend?: boolean;
  legend_position?: EnergyBreakdownLegendPosition;
  show_tooltip?: boolean;
  show_total?: boolean;
  show_legend_value?: boolean;
  show_legend_percentage?: boolean;
  show_icons?: boolean;
  max_items?: number;
  group_others?: boolean;
  sort?: boolean;
  unit_of_measurement?: string;
  decimals?: number;
  donut_thickness?: number;
  bar_thickness?: number;
  section_radius?: number;
  energy_date_selection?: boolean;
  collection_key?: string;
};

export type ResolvedSegment = {
  key: string;
  entity?: string;
  name: string;
  icon?: string;
  color: string;
  value: number;
  percent: number;
  unit: string;
  decimals?: number;
  config?: EnergyBreakdownEntityConfig;
};
