import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { onlyNegative, onlyPositive } from "@flixlix-cards/shared/states/utils/negative-positive";
import { type Battery, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import {
  computeFieldIcon,
  computeFieldName,
} from "@flixlix-cards/shared/utils/compute-field-attributes";
import {
  getPrimaryBattery,
  hasBatteryEntity,
  normalizeBatteries,
} from "@flixlix-cards/shared/utils/normalize-batteries";
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
    toBattery: number | null;
    fromBattery: number | null;
    toGrid: number | null;
    toHome: number | null;
  };
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  color: {
    fromBattery?: string | number[];
    toBattery?: string | number[];
    icon_type?: string | boolean;
    circle_type?: string;
  };
  unit?: string;
  unit_white_space?: boolean;
  decimals?: number;
};

export const getBatteryConfigStateOfCharge = (
  hass: HomeAssistant,
  battery: Battery | undefined
): number | null => {
  const entity = battery?.state_of_charge;
  if (entity === undefined) return null;
  return getEntityState(hass, entity);
};

export const getBatteryConfigInState = (
  hass: HomeAssistant,
  battery: Battery | undefined
): number | null => {
  const entity = battery?.entity;
  if (entity === undefined) return null;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);
    if (battery?.invert_state) return onlyPositive(state);
    return onlyNegative(state);
  }
  return getEntityStateWatts(hass, entity.production);
};

export const getBatteryConfigOutState = (
  hass: HomeAssistant,
  battery: Battery | undefined
): number | null => {
  const entity = battery?.entity;
  if (entity === undefined) return null;

  if (typeof entity === "string") {
    const state = getEntityStateWatts(hass, entity);
    if (battery?.invert_state) return onlyNegative(state);
    return onlyPositive(state);
  }
  return getEntityStateWatts(hass, entity.consumption);
};

export const getBatteryStateOfCharge = (hass: HomeAssistant, config: FlowCardPlusConfig) =>
  getBatteryConfigStateOfCharge(hass, getPrimaryBattery(config.entities.battery));

export const getBatteryInState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const batteries = normalizeBatteries(config.entities.battery);
  if (batteries.length === 0) return null;
  return batteries.reduce((sum, battery) => sum + (getBatteryConfigInState(hass, battery) ?? 0), 0);
};

export const getBatteryOutState = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const batteries = normalizeBatteries(config.entities.battery);
  if (batteries.length === 0) return null;
  return batteries.reduce(
    (sum, battery) => sum + (getBatteryConfigOutState(hass, battery) ?? 0),
    0
  );
};

export const createBatteryObject = ({
  hass,
  batteryConfig,
  fallbackName,
  toBattery,
  fromBattery,
}: {
  hass: HomeAssistant;
  batteryConfig: Battery;
  fallbackName: string;
  toBattery: number | null;
  fromBattery: number | null;
}): BatteryObject => {
  const has = hasBatteryEntity(batteryConfig);
  const battery: BatteryObject = {
    config: batteryConfig,
    entity: batteryConfig.entity,
    has,
    mainEntity:
      typeof batteryConfig.entity === "object"
        ? batteryConfig.entity.consumption
        : batteryConfig.entity,
    name: computeFieldName(hass, batteryConfig, fallbackName),
    icon: computeFieldIcon(hass, batteryConfig, "mdi:battery-high"),
    state_of_charge: {
      state: getBatteryConfigStateOfCharge(hass, batteryConfig),
      unit: batteryConfig.state_of_charge_unit ?? "%",
      unit_white_space: batteryConfig.state_of_charge_unit_white_space ?? true,
      decimals: batteryConfig.state_of_charge_decimals || 0,
    },
    state: {
      toBattery,
      fromBattery,
      toGrid: 0,
      toHome: 0,
    },
    tap_action: batteryConfig.tap_action,
    hold_action: batteryConfig.hold_action,
    double_tap_action: batteryConfig.double_tap_action,
    color: {
      fromBattery: batteryConfig.color?.consumption,
      toBattery: batteryConfig.color?.production,
      icon_type: undefined,
      circle_type: batteryConfig.color_circle,
    },
  };

  if (battery.state_of_charge.state === null) {
    battery.icon = "mdi:battery";
  } else if (battery.state_of_charge.state <= 72 && battery.state_of_charge.state > 44) {
    battery.icon = "mdi:battery-medium";
  } else if (battery.state_of_charge.state <= 44 && battery.state_of_charge.state > 16) {
    battery.icon = "mdi:battery-low";
  } else if (battery.state_of_charge.state <= 16) {
    battery.icon = "mdi:battery-outline";
  }
  if (batteryConfig.icon !== undefined) battery.icon = batteryConfig.icon;
  if (batteryConfig.use_metadata) {
    const metadataIcon = computeFieldIcon(hass, batteryConfig, "NO_ICON_METADATA");
    if (metadataIcon !== "NO_ICON_METADATA") {
      battery.icon = metadataIcon;
    }
  }

  return battery;
};

export const createAggregateBatteryObject = ({
  batteries,
  fallbackName,
}: {
  batteries: BatteryObject[];
  fallbackName: string;
}): BatteryObject => {
  const primary = batteries[0];
  if (!primary) {
    return {
      config: { entity: "" },
      entity: undefined,
      has: false,
      mainEntity: undefined,
      name: fallbackName,
      icon: "mdi:battery",
      state_of_charge: {
        state: null,
        unit: "%",
        unit_white_space: true,
        decimals: 0,
      },
      state: {
        toBattery: null,
        fromBattery: null,
        toGrid: 0,
        toHome: 0,
      },
      color: {
        fromBattery: undefined,
        toBattery: undefined,
        icon_type: undefined,
        circle_type: undefined,
      },
    };
  }

  return {
    ...primary,
    has: batteries.some((battery) => battery.has),
    state: {
      toBattery: batteries.reduce((sum, battery) => sum + (battery.state.toBattery ?? 0), 0),
      fromBattery: batteries.reduce((sum, battery) => sum + (battery.state.fromBattery ?? 0), 0),
      toGrid: 0,
      toHome: 0,
    },
  };
};
