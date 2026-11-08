import { type ActionConfig } from "custom-card-helpers";
import { type TemplateResult } from "lit";

export type ActionConfigSet = {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

export interface CardMainContext {
  openDetails: (
    event: { stopPropagation: () => void; key?: string; target: HTMLElement },
    config?: ActionConfig | ActionConfigSet,
    entityId?: string,
    action?: "tap" | "hold" | "double_tap"
  ) => void;
  onEntityClick: (
    event: MouseEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ) => void;
  onEntityDoubleClick: (
    event: MouseEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ) => void;
  onEntityPointerDown: (
    event: PointerEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ) => void;
  onEntityPointerUp: (event: PointerEvent) => void;
}

export type ComboEntity = {
  consumption: string;
  production: string;
};

export type SecondaryInfoType = {
  entity?: string;
  unit_of_measurement?: string;
  icon?: string;
  display_zero?: boolean;
  unit_white_space?: boolean;
  display_zero_tolerance?: number;
  color_value?: boolean | "production" | "consumption";
  template?: string;
  accept_negative?: boolean;
  decimals?: number;
} & ActionConfigSet;

export interface BaseConfigEntity extends ActionConfigSet {
  entity: string | ComboEntity;
  name?: string;
  icon?: string;
  color?: ComboEntity | ColorValue;
  color_icon?: boolean | string;
  display_state?: "two_way" | "one_way" | "one_way_no_zero";
  display_zero_tolerance?: number;
  unit_of_measurement?: string;
  unit_white_space?: boolean;
  use_metadata?: boolean;
  secondary_info?: SecondaryInfoType;
  invert_state?: boolean;
}

export type GridPowerOutage = {
  entity: string;
  state_alert?: string;
  label_alert?: string;
  icon_alert?: string;
  entity_generator?: string;
};

export type IndividualDeviceType = BaseConfigEntity & {
  entity: string;
  color?: ColorValue;
  color_icon?: boolean;
  inverted_animation?: boolean;
  display_zero?: boolean;
  display_zero_state?: boolean;
  color_value?: boolean;
  color_label?: boolean;
  calculate_flow_rate?: boolean | number;
  use_metadata?: boolean;
  decimals?: number;
  show_direction?: boolean;
};

export type EntityType =
  | "battery"
  | "grid"
  | "solar"
  | "individual1"
  | "individual2"
  | "home"
  | "fossil_fuel_percentage";

export type TemplatesObj = {
  gridSecondary: string | undefined;
  solarSecondary: string | undefined;
  homeSecondary: string | undefined;
  individual: (string | undefined)[];
  nonFossilFuelSecondary: string | undefined;
};

export type ColorValue = string | number[];

type CircleColorType = "color_dynamically" | "production" | "consumption" | "no_color";

export type NodeState = number | null;

export type SecondaryInfoObject = ActionConfigSet & {
  entity?: string;
  decimals?: number;
  template?: string;
  has: boolean;
  state: string | number | null;
  icon?: string;
  unit?: string;
  unit_white_space?: boolean;
  accept_negative?: boolean;
  /** The formatted state. */
  text: string;
  /** The rendered secondary-info template, when one is configured. */
  templateResult: string | undefined;
  show: boolean;
};

export type GridObject = ActionConfigSet & {
  entity: string | ComboEntity | undefined;
  has: boolean;
  hasReturnToGrid: boolean;
  state: {
    fromGrid: NodeState;
    toGrid: NodeState;
    toBattery: NodeState;
    toHome: NodeState;
  };
  display: { fromGrid: string; toGrid: string };
  powerOutage: {
    has: boolean;
    isOutage: boolean;
    icon: string;
    name: string | TemplateResult<1>;
    entityGenerator?: string;
  };
  icon: string;
  name: string;
  mainEntity: string | undefined;
  color: {
    fromGrid?: ColorValue;
    toGrid?: ColorValue;
    icon_type?: "color_dynamically" | "no_color" | "production" | "consumption";
    circle_type?: CircleColorType;
  };
  secondary: SecondaryInfoObject & {
    color: {
      type?: boolean | "production" | "consumption";
    };
  };
};

export type SolarObject = ActionConfigSet & {
  entity: string | undefined;
  has: boolean;
  state: {
    total: NodeState;
    toHome: NodeState;
    toGrid: NodeState;
    toBattery: NodeState;
  };
  /** The formatted production, or undefined when it is hidden. */
  display: string | undefined;
  icon: string;
  name: string;
  secondary: SecondaryInfoObject;
};

export type BatteryObject = ActionConfigSet & {
  entity: string | ComboEntity | undefined;
  has: boolean;
  mainEntity: string | undefined;
  name: string;
  icon: string;
  state_of_charge: {
    state: NodeState;
    unit: string;
    unit_white_space: boolean;
    decimals: number;
  };
  state: {
    toBattery: NodeState;
    fromBattery: NodeState;
    toGrid: NodeState;
    toHome: NodeState;
  };
  display: { toBattery: string; fromBattery: string; stateOfCharge: string };
  color: {
    fromBattery?: ColorValue;
    toBattery?: ColorValue;
    icon_type?: string | boolean;
    circle_type?: CircleColorType;
  };
};

export type HomeObject = ActionConfigSet & {
  entity: string | undefined;
  has: boolean;
  state: NodeState;
  icon: string;
  name: string;
  secondary: SecondaryInfoObject;
};

export type NonFossilObject = ActionConfigSet & {
  entity: string | undefined;
  name: string;
  icon: string;
  has: boolean;
  hasPercentage: boolean;
  state: {
    power: NodeState;
  };
  display: string;
  color?: ColorValue;
  color_value?: boolean;
  secondary: SecondaryInfoObject & {
    color_value?: SecondaryInfoType["color_value"];
  };
};

export type IndividualObject = {
  field: IndividualDeviceType | undefined;
  entity: string;
  has: boolean;
  state: number | null;
  displayZero: boolean;
  displayZeroTolerance: number;
  icon: string;
  name: string;
  color: string | null;
  invertAnimation: boolean;
  showDirection: boolean;
  /** The formatted state. */
  displayState: string;
  secondary: ActionConfigSet & {
    entity: string | undefined;
    icon: string | undefined;
    text: string | undefined;
    templateResult: string | undefined;
    show: boolean;
  };
};

export type OfflineStr = "unavailable" | "unknown";
export const offlineStr = ["unavailable", "unknown"];

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: unknown;
  /** @deprecated Use `grid_options` instead */
  layout_options?: LovelaceLayoutOptions;
  grid_options?: LovelaceGridOptions;
  type: string;
  [key: string]: unknown;
  visibility?: Condition[];
  disabled?: boolean;
}

type Condition =
  | LocationCondition
  | NumericStateCondition
  | StateCondition
  | ScreenCondition
  | TimeCondition
  | UserCondition
  | OrCondition
  | AndCondition
  | NotCondition;

interface BaseCondition {
  condition: string;
}

interface LocationCondition extends BaseCondition {
  condition: "location";
  locations?: string[];
}

interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  entity?: string;
  below?: string | number;
  above?: string | number;
}

interface StateCondition extends BaseCondition {
  condition: "state";
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

interface ScreenCondition extends BaseCondition {
  condition: "screen";
  media_query?: string;
}

type WeekdayShort = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

interface TimeCondition extends BaseCondition {
  condition: "time";
  after?: string;
  before?: string;
  weekdays?: WeekdayShort[];
}

interface UserCondition extends BaseCondition {
  condition: "user";
  users?: string[];
}

interface OrCondition extends BaseCondition {
  condition: "or";
  conditions?: Condition[];
}

interface AndCondition extends BaseCondition {
  condition: "and";
  conditions?: Condition[];
}

interface NotCondition extends BaseCondition {
  condition: "not";
  conditions?: Condition[];
}

interface LovelaceLayoutOptions {
  grid_columns?: number | "full";
  grid_rows?: number | "auto";
  grid_max_columns?: number;
  grid_min_columns?: number;
  grid_min_rows?: number;
  grid_max_rows?: number;
}

interface LovelaceGridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  max_columns?: number;
  min_columns?: number;
  min_rows?: number;
  max_rows?: number;
  fixed_rows?: boolean;
  fixed_columns?: boolean;
}
