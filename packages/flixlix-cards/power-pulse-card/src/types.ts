import { type ActionConfig, type LovelaceCardConfig } from "custom-card-helpers";

export interface FlixlixActionConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface GridEntityConfig extends FlixlixActionConfig {
  entity: string | { consumption?: string; production?: string };
  name?: string;
  icon?: string;
  color?: { consumption?: string; production?: string };
}

export interface SolarEntityConfig extends FlixlixActionConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

export interface BatteryEntityConfig extends FlixlixActionConfig {
  entity: string | { consumption?: string; production?: string };
  state_of_charge?: string;
  show_state_of_charge?: boolean;
  name?: string;
  icon?: string;
  color?: { in?: string; out?: string };
}

export interface HomeEntityConfig extends FlixlixActionConfig {
  entity?: string;
  name?: string;
  icon?: string;
  color?: string;
  override_state?: boolean;
}

export interface DeviceEntityConfig extends FlixlixActionConfig {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

export interface FlixlixPowerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  max_expected_power?: number;
  min_expected_power?: number;
  kilo_threshold?: number;
  base_decimals?: number;
  kilo_decimals?: number;
  number_transition_ms?: number;
  dot_size?: number;
  dot_length?: number;
  max_devices?: number;
  gauges?: {
    self_consumption?: boolean;
    autarky?: boolean;
  };
  entities: {
    grid?: GridEntityConfig;
    solars?: SolarEntityConfig[];
    batteries?: BatteryEntityConfig[];
    home?: HomeEntityConfig;
    devices?: DeviceEntityConfig[];
  };
}
