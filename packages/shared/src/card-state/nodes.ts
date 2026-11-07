import { isEntityAvailable } from "@flixlix-cards/shared/states/utils/existence-entity";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getFirstEntityName } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { computeNonFossilFromCollection } from "@flixlix-cards/shared/states/utils/energy-period";
import {
  type BatteryObject,
  type ConfigEntities,
  type GridObject,
  type HomeObject,
  type NonFossilObject,
  type SecondaryInfoObject,
  type SecondaryInfoType,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import {
  computeFieldIcon,
  computeFieldName,
} from "@flixlix-cards/shared/utils/compute-field-attributes";
import { unavailableOrMisconfiguredError } from "@flixlix-cards/shared/utils/unavailable-error";
import { isNumberValue } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";
import { html } from "lit";
import { type Split } from "./distribution";
import { type Formatter } from "./format";
import { type CardStateInput, type ReadyReadings } from "./types";

/** Node totals and presence once tolerance, display_zero and the distribution split are applied. */
export type Settled = Split & {
  has: { grid: boolean; solar: boolean; battery: boolean };
  outage: boolean;
  solarTotal: number;
  toBattery: number;
  fromBattery: number;
};

type NodeContext = {
  input: CardStateInput;
  readings: ReadyReadings;
  settled: Settled;
  format: Formatter;
};

const secondaryState = (hass: HomeAssistant, entity: string | undefined) => {
  const state = entity === undefined ? undefined : hass.states[getFirstEntityName(entity)]?.state;
  if (state === undefined) {
    return null;
  }
  return isNumberValue(state) ? Number(state) : state;
};

const secondaryInfo = (
  { input, format }: NodeContext,
  info: SecondaryInfoType | undefined,
  templateResult: string | undefined
): SecondaryInfoObject => {
  const state = secondaryState(input.hass, info?.entity);
  const has = info?.entity !== undefined;
  const accept_negative = info?.accept_negative ?? false;
  return {
    entity: info?.entity,
    decimals: info?.decimals,
    template: info?.template,
    has,
    state,
    icon: info?.icon,
    unit: info?.unit_of_measurement,
    accept_negative,
    unit_white_space: info?.unit_white_space,
    tap_action: info?.tap_action,
    hold_action: info?.hold_action,
    double_tap_action: info?.double_tap_action,
    text: format(state, {
      unit: info?.unit_of_measurement,
      unitWhiteSpace: info?.unit_white_space,
      decimals: info?.decimals,
      accept_negative,
    }),
    templateResult,
    show: has || !!info?.template,
  };
};

const gridIconTypes = ["color_dynamically", "no_color", "production", "consumption"] as const;
const toGridIconType = (colorIcon: unknown) => gridIconTypes.find((type) => type === colorIcon);

export const isOutage = (hass: HomeAssistant, entities: ConfigEntities): boolean => {
  const outage = entities.grid?.power_outage;
  const outageState = outage?.entity === undefined ? undefined : hass.states[outage.entity]?.state;
  return entities.grid !== undefined && outageState === (outage?.state_alert ?? "on");
};

export const gridNode = (context: NodeContext): GridObject => {
  const { input, settled, format } = context;
  const { hass, config } = input;
  const grid = config.entities.grid;
  const outageIcon = grid?.power_outage?.icon_alert?.length
    ? grid.power_outage.icon_alert
    : "mdi:transmission-tower-off";
  const icon = computeFieldIcon(hass, grid, "mdi:transmission-tower");
  return {
    entity: grid?.entity,
    has: settled.has.grid,
    hasReturnToGrid: typeof grid?.entity === "string" || !!grid?.entity?.production,
    state: {
      fromGrid: settled.fromGrid,
      toGrid: settled.toGrid,
      toBattery: settled.gridToBattery,
      toHome: settled.gridToHome,
    },
    display: { fromGrid: format(settled.fromGrid), toGrid: format(settled.toGrid) },
    powerOutage: {
      has: grid?.power_outage?.entity !== undefined,
      isOutage: settled.outage,
      icon: outageIcon,
      name: grid?.power_outage?.label_alert ?? html`Power<br />Outage`,
      entityGenerator: grid?.power_outage?.entity_generator,
    },
    icon: settled.outage ? outageIcon : icon,
    name: computeFieldName(
      hass,
      grid,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.grid")
    ),
    mainEntity:
      typeof grid?.entity === "object"
        ? grid.entity.consumption || grid.entity.production
        : grid?.entity,
    color: {
      fromGrid: grid?.color?.consumption,
      toGrid: grid?.color?.production,
      icon_type: toGridIconType(grid?.color_icon),
      circle_type: grid?.color_circle,
    },
    tap_action: grid?.tap_action,
    hold_action: grid?.hold_action,
    double_tap_action: grid?.double_tap_action,
    secondary: {
      ...secondaryInfo(context, grid?.secondary_info, input.templates.gridSecondary),
      color: { type: grid?.secondary_info?.color_value },
    },
  };
};

const solarSecondaryShown = (
  solar: ConfigEntities["solar"],
  secondary: SecondaryInfoObject
): boolean => {
  if (secondary.templateResult) {
    return true;
  }
  if (solar?.secondary_info?.display_zero === true) {
    return true;
  }
  if (!secondary.state) {
    return false;
  }
  if (!isNumberValue(secondary.state)) {
    return true;
  }
  const tolerance = solar?.secondary_info?.display_zero_tolerance ?? 0;
  return Number(secondary.state) >= tolerance || solar?.secondary_info?.accept_negative === true;
};

export const solarNode = (context: NodeContext): SolarObject => {
  const { input, readings, settled, format } = context;
  const { hass } = input;
  const solar = input.config.entities.solar;
  const secondary = secondaryInfo(context, solar?.secondary_info, input.templates.solarSecondary);
  const ownProduction = solar?.secondary_info?.sum_total
    ? settled.solarTotal - readings.solar.secondary
    : settled.solarTotal;
  return {
    entity: solar?.entity,
    has: settled.has.solar,
    state: {
      total: settled.solarTotal,
      toHome: settled.solarToHome,
      toGrid: settled.solarToGrid,
      toBattery: settled.solarToBattery,
    },
    display:
      solar?.display_zero_state !== false || ownProduction > 0 ? format(ownProduction) : undefined,
    icon: computeFieldIcon(hass, solar, "mdi:solar-power"),
    name: computeFieldName(
      hass,
      solar,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.solar")
    ),
    tap_action: solar?.tap_action,
    hold_action: solar?.hold_action,
    double_tap_action: solar?.double_tap_action,
    secondary: { ...secondary, show: secondary.show && solarSecondaryShown(solar, secondary) },
  };
};

const batteryIcon = (hass: HomeAssistant, entities: ConfigEntities, soc: number | null) => {
  const battery = entities.battery;
  const metadataIcon = battery?.use_metadata
    ? computeFieldIcon(hass, battery, "NO_ICON_METADATA")
    : "NO_ICON_METADATA";
  if (metadataIcon !== "NO_ICON_METADATA") {
    return metadataIcon;
  }
  if (battery?.icon !== undefined) {
    return battery.icon;
  }
  if (soc === null) {
    return "mdi:battery";
  }
  if (soc > 72) {
    return computeFieldIcon(hass, battery, "mdi:battery-high");
  }
  if (soc > 44) {
    return "mdi:battery-medium";
  }
  return soc > 16 ? "mdi:battery-low" : "mdi:battery-outline";
};

export const batteryNode = ({ input, settled, format }: NodeContext): BatteryObject => {
  const { hass } = input;
  const { entities } = input.config;
  const battery = entities.battery;
  const soc =
    battery?.state_of_charge === undefined ? null : getEntityState(hass, battery.state_of_charge);
  const socFormat = {
    unit: battery?.state_of_charge_unit ?? "%",
    unitWhiteSpace: battery?.state_of_charge_unit_white_space ?? true,
    decimals: battery?.state_of_charge_decimals ?? 0,
  };
  return {
    entity: battery?.entity,
    has: settled.has.battery,
    mainEntity: typeof battery?.entity === "object" ? battery.entity.consumption : battery?.entity,
    name: computeFieldName(
      hass,
      battery,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.battery")
    ),
    icon: batteryIcon(hass, entities, soc),
    state_of_charge: {
      state: soc,
      unit: socFormat.unit,
      unit_white_space: socFormat.unitWhiteSpace,
      decimals: socFormat.decimals,
    },
    state: {
      toBattery: settled.toBattery,
      fromBattery: settled.fromBattery,
      toGrid: settled.batteryToGrid,
      toHome: settled.batteryToHome,
    },
    display: {
      toBattery: format(settled.toBattery),
      fromBattery: format(settled.fromBattery),
      stateOfCharge: format(soc, { ...socFormat, accept_negative: true }),
    },
    tap_action: battery?.tap_action,
    hold_action: battery?.hold_action,
    double_tap_action: battery?.double_tap_action,
    color: {
      fromBattery: battery?.color?.consumption,
      toBattery: battery?.color?.production,
      icon_type: undefined,
      circle_type: battery?.color_circle,
    },
  };
};

export const homeNode = (context: NodeContext, label: string): HomeObject => {
  const { hass, config, templates } = context.input;
  const home = config.entities.home;
  return {
    entity: home?.entity,
    has: home?.entity !== undefined,
    state: null,
    icon: computeFieldIcon(hass, home, "mdi:home"),
    name: computeFieldName(hass, home, label),
    tap_action: home?.tap_action,
    hold_action: home?.hold_action,
    double_tap_action: home?.double_tap_action,
    secondary: secondaryInfo(context, home?.secondary_info, templates.homeSecondary),
  };
};

/** The non-fossil share of grid import, as energy/power or as a percentage. */
const nonFossilText = ({ input, readings, settled, format }: NodeContext): string => {
  const fossil = input.config.entities.fossil_fuel_percentage;
  const unitWhiteSpace = fossil?.unit_white_space ?? true;
  const asPercentage = fossil?.state_type === "percentage";
  const tolerance = fossil?.display_zero_tolerance ?? 0;
  const tolerated = (value: number) => (tolerance && value < tolerance ? 0 : value);
  const show = (amount: number, percentage: number) =>
    asPercentage
      ? format(tolerated(percentage), { unit: "%", unitWhiteSpace, decimals: 0 })
      : format(tolerated(amount), { unitWhiteSpace });

  if (readings.fossilEnergyConsumption) {
    const share = computeNonFossilFromCollection(
      readings.fossilEnergyConsumption,
      settled.fromGrid
    );
    return show(share.nonFossilEnergy, share.nonFossilPercentage);
  }
  if (!fossil?.entity || !isEntityAvailable(input.hass, fossil.entity)) {
    unavailableOrMisconfiguredError(fossil?.entity);
    return "NaN";
  }
  const fossilPercentage = getEntityState(input.hass, fossil.entity) ?? 0;
  const gridImport =
    typeof input.config.entities.grid?.entity === "string"
      ? settled.fromGrid
      : (readings.grid.fromGrid ?? 0);
  return show(gridImport * (1 - fossilPercentage / 100), 100 - fossilPercentage);
};

export const nonFossilNode = (context: NodeContext): NonFossilObject => {
  const { input, settled } = context;
  const { hass, templates } = input;
  const fossil = input.config.entities.fossil_fuel_percentage;
  return {
    entity: fossil?.entity,
    name: computeFieldName(hass, fossil, hass.localize("card.label.non_fossil_fuel_percentage")),
    icon: computeFieldIcon(hass, fossil, "mdi:leaf"),
    has: settled.nonFossilHas,
    hasPercentage: settled.nonFossilHas,
    state: { power: settled.nonFossilPower },
    display: settled.nonFossilHas ? nonFossilText(context) : "",
    color: fossil?.color,
    color_value: fossil?.color_value,
    tap_action: fossil?.tap_action,
    hold_action: fossil?.hold_action,
    double_tap_action: fossil?.double_tap_action,
    secondary: {
      ...secondaryInfo(context, fossil?.secondary_info, templates.nonFossilFuelSecondary),
      color_value: fossil?.secondary_info?.color_value,
    },
  };
};

export type { NodeContext };
