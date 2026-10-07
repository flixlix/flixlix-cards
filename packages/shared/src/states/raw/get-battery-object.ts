import {
  getBatteryConfigInState,
  getBatteryConfigOutState,
  getBatteryConfigStateOfCharge,
} from "@flixlix-cards/shared/states/raw/battery";
import { type Battery, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import {
  computeFieldIcon,
  computeFieldName,
} from "@flixlix-cards/shared/utils/compute-field-attributes";
import { type ActionConfig, type HomeAssistant } from "custom-card-helpers";

export type BatteryObject = {
  config: Battery;
  entity: Battery["entity"] | undefined;
  has: boolean;
  mainEntity: string | undefined;
  name: string;
  icon: string;
  state_of_charge: {
    state: number | null;
    unit: string;
    unit_white_space: boolean;
    decimals: number;
  };
  state: {
    toBattery: number;
    fromBattery: number;
    toGrid: number;
    toHome: number;
  };
  unit?: string;
  unit_white_space?: boolean;
  decimals?: number;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  color: {
    fromBattery?: string | number[];
    toBattery?: string | number[];
    icon_type?: string | boolean;
    circle_type?: Battery["color_circle"];
  };
};

const resolveBatteryIcon = (
  hass: HomeAssistant,
  battery: Battery,
  stateOfCharge: number | null
): string => {
  if (battery.icon !== undefined) return battery.icon;

  if (battery.use_metadata) {
    const metadataIcon = computeFieldIcon(hass, battery, "NO_ICON_METADATA");
    if (metadataIcon !== "NO_ICON_METADATA") return metadataIcon;
  }

  if (stateOfCharge === null) return "mdi:battery";
  if (stateOfCharge <= 72 && stateOfCharge > 44) return "mdi:battery-medium";
  if (stateOfCharge <= 44 && stateOfCharge > 16) return "mdi:battery-low";
  if (stateOfCharge <= 16) return "mdi:battery-outline";
  return "mdi:battery-high";
};

export const getBatteryObject = ({
  hass,
  config,
  field,
  fallbackName,
  stateOverrides,
}: {
  hass: HomeAssistant;
  config: FlowCardPlusConfig;
  field: Battery;
  fallbackName: string;
  stateOverrides?: {
    toBattery?: number;
    fromBattery?: number;
    stateOfCharge?: number | null;
  };
}): BatteryObject => {
  const toBattery = stateOverrides?.toBattery ?? getBatteryConfigInState(hass, field) ?? 0;
  const fromBattery = stateOverrides?.fromBattery ?? getBatteryConfigOutState(hass, field) ?? 0;
  const stateOfCharge =
    stateOverrides?.stateOfCharge !== undefined
      ? stateOverrides.stateOfCharge
      : getBatteryConfigStateOfCharge(hass, field);
  const hasEntity =
    typeof field.entity === "object"
      ? Boolean(field.entity.consumption || field.entity.production)
      : field.entity !== undefined;
  const hasFlow = toBattery !== 0 || fromBattery !== 0;
  const has = hasEntity && (field.display_zero !== false || hasFlow);

  return {
    config: field,
    entity: field.entity,
    has,
    mainEntity: typeof field.entity === "object" ? field.entity.consumption : field.entity,
    name: computeFieldName(hass, field, fallbackName),
    icon: resolveBatteryIcon(hass, field, stateOfCharge),
    state_of_charge: {
      state: stateOfCharge,
      unit: field.state_of_charge_unit ?? "%",
      unit_white_space: field.state_of_charge_unit_white_space ?? true,
      decimals: field.state_of_charge_decimals || 0,
    },
    state: {
      toBattery,
      fromBattery,
      toGrid: 0,
      toHome: 0,
    },
    unit: field.unit_of_measurement,
    unit_white_space: field.unit_white_space,
    decimals: undefined,
    tap_action: field.tap_action,
    hold_action: field.hold_action,
    double_tap_action: field.double_tap_action,
    color: {
      fromBattery: field.color?.consumption,
      toBattery: field.color?.production,
      icon_type: field.color_icon,
      circle_type: field.color_circle,
    },
  };
};

export const aggregateBatteryObjects = ({
  hass,
  batteries,
}: {
  hass: HomeAssistant;
  batteries: BatteryObject[];
}): BatteryObject | null => {
  const visible = batteries.filter((battery) => battery.has);
  if (visible.length === 0) {
    return batteries[0] ?? null;
  }

  const primary = visible[0];
  if (!primary) return batteries[0] ?? null;
  const toBattery = visible.reduce((sum, battery) => sum + (battery.state.toBattery ?? 0), 0);
  const fromBattery = visible.reduce((sum, battery) => sum + (battery.state.fromBattery ?? 0), 0);

  let weightedSum = 0;
  let totalCapacity = 0;
  let plainSum = 0;
  let plainCount = 0;
  let showStateOfCharge = false;

  for (const battery of visible) {
    const soc = battery.state_of_charge.state;
    if (battery.config.show_state_of_charge !== false && soc !== null) {
      showStateOfCharge = true;
    }
    if (soc === null) continue;
    plainSum += soc;
    plainCount += 1;
    if (typeof battery.config.capacity === "number" && battery.config.capacity > 0) {
      weightedSum += soc * battery.config.capacity;
      totalCapacity += battery.config.capacity;
    }
  }

  const aggregatedSoc =
    totalCapacity > 0 ? weightedSum / totalCapacity : plainCount > 0 ? plainSum / plainCount : null;

  const aggregateConfig: Battery = {
    ...primary.config,
    name: "Batteries",
    icon: undefined,
    show_state_of_charge: showStateOfCharge,
    state_of_charge: undefined,
  };

  return {
    ...primary,
    config: aggregateConfig,
    has: true,
    name: "Batteries",
    state_of_charge: {
      ...primary.state_of_charge,
      state: aggregatedSoc,
    },
    state: {
      toBattery,
      fromBattery,
      toGrid: 0,
      toHome: 0,
    },
    icon: resolveBatteryIcon(hass, aggregateConfig, aggregatedSoc),
  };
};
