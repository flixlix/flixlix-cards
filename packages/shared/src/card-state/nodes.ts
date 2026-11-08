import { isEntityAvailable } from "@flixlix-cards/shared/states/utils/existence-entity";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getFirstEntityName } from "@flixlix-cards/shared/states/utils/mutli-entity";
import {
  type ActionConfigSet,
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
import { type Formatter } from "./format";
import { type Normalized } from "./normalize";
import { type NodeFlows } from "./solve";
import { type CardStateInput, type ReadyReadings } from "./types";

/** Node totals and presence with the flows solved from them. */
export type Balance = Normalized & Readonly<{ flows: NodeFlows }>;

type NodeContext = {
  input: CardStateInput;
  readings: ReadyReadings;
  balance: Balance;
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

const nodeActions = (entity: ActionConfigSet | undefined): ActionConfigSet => ({
  tap_action: entity?.tap_action,
  hold_action: entity?.hold_action,
  double_tap_action: entity?.double_tap_action,
});

type GridConfig = ConfigEntities["grid"];

const gridPowerOutage = (grid: GridConfig, outage: boolean): GridObject["powerOutage"] => {
  const powerOutage = grid?.power_outage;
  return {
    has: powerOutage?.entity !== undefined,
    isOutage: outage,
    icon: powerOutage?.icon_alert?.length ? powerOutage.icon_alert : "mdi:transmission-tower-off",
    name: powerOutage?.label_alert ?? html`Power<br />Outage`,
    entityGenerator: powerOutage?.entity_generator,
  };
};

const gridColor = (grid: GridConfig): GridObject["color"] => ({
  fromGrid: grid?.color?.consumption,
  toGrid: grid?.color?.production,
  icon_type: toGridIconType(grid?.color_icon),
  circle_type: grid?.color_circle,
});

const gridMainEntity = (grid: GridConfig): string | undefined =>
  typeof grid?.entity === "object"
    ? grid.entity.consumption || grid.entity.production
    : grid?.entity;

export const gridNode = (context: NodeContext): GridObject => {
  const { input, balance, format } = context;
  const { totals, flows } = balance;
  const { hass, config } = input;
  const grid = config.entities.grid;
  const powerOutage = gridPowerOutage(grid, balance.outage);
  return {
    entity: grid?.entity,
    has: balance.presence.grid,
    hasReturnToGrid: typeof grid?.entity === "string" || !!grid?.entity?.production,
    state: {
      fromGrid: totals.gridImport,
      toGrid: totals.gridExport,
      toBattery: flows.gridToBattery,
      toHome: flows.gridToHome,
    },
    display: { fromGrid: format(totals.gridImport), toGrid: format(totals.gridExport) },
    powerOutage,
    icon: balance.outage
      ? powerOutage.icon
      : computeFieldIcon(hass, grid, "mdi:transmission-tower"),
    name: computeFieldName(
      hass,
      grid,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.grid")
    ),
    mainEntity: gridMainEntity(grid),
    color: gridColor(grid),
    ...nodeActions(grid),
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
  const { input, readings, balance, format } = context;
  const { totals, flows } = balance;
  const { hass } = input;
  const solar = input.config.entities.solar;
  const secondary = secondaryInfo(context, solar?.secondary_info, input.templates.solarSecondary);
  const ownProduction = solar?.secondary_info?.sum_total
    ? totals.solar - readings.solar.secondary
    : totals.solar;
  return {
    entity: solar?.entity,
    has: balance.presence.solar,
    state: {
      total: totals.solar,
      toHome: flows.solarToHome,
      toGrid: flows.solarToGrid,
      toBattery: flows.solarToBattery,
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

const stateOfChargeFormat = (battery: ConfigEntities["battery"]) => ({
  unit: battery?.state_of_charge_unit ?? "%",
  unitWhiteSpace: battery?.state_of_charge_unit_white_space ?? true,
  decimals: battery?.state_of_charge_decimals ?? 0,
});

export const batteryNode = ({ input, balance, format }: NodeContext): BatteryObject => {
  const { totals, flows } = balance;
  const { hass } = input;
  const { entities } = input.config;
  const battery = entities.battery;
  const soc =
    battery?.state_of_charge === undefined ? null : getEntityState(hass, battery.state_of_charge);
  const socFormat = stateOfChargeFormat(battery);
  return {
    entity: battery?.entity,
    has: balance.presence.battery,
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
      toBattery: totals.batteryCharge,
      fromBattery: totals.batteryDischarge,
      toGrid: flows.batteryToGrid,
      toHome: flows.batteryToHome,
    },
    display: {
      toBattery: format(totals.batteryCharge),
      fromBattery: format(totals.batteryDischarge),
      stateOfCharge: format(soc, { ...socFormat, accept_negative: true }),
    },
    ...nodeActions(battery),
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
const nonFossilText = ({ input, readings, balance, format }: NodeContext): string => {
  const fossil = input.config.entities.fossil_fuel_percentage;
  if (
    !readings.fossilEnergyConsumption &&
    (!fossil?.entity || !isEntityAvailable(input.hass, fossil.entity))
  ) {
    unavailableOrMisconfiguredError(fossil?.entity);
    return "NaN";
  }
  const unitWhiteSpace = fossil?.unit_white_space ?? true;
  const tolerance = fossil?.display_zero_tolerance ?? 0;
  const tolerated = (value: number) => (tolerance && value < tolerance ? 0 : value);
  const { gridImport, nonFossilFraction } = balance.totals;
  return fossil?.state_type === "percentage"
    ? format(tolerated(nonFossilFraction * 100), { unit: "%", unitWhiteSpace, decimals: 0 })
    : format(tolerated(gridImport * nonFossilFraction), { unitWhiteSpace });
};

export const nonFossilNode = (context: NodeContext): NonFossilObject => {
  const { input, balance } = context;
  const { hass, templates } = input;
  const fossil = input.config.entities.fossil_fuel_percentage;
  const has = balance.presence.nonFossil;
  return {
    entity: fossil?.entity,
    name: computeFieldName(hass, fossil, hass.localize("card.label.non_fossil_fuel_percentage")),
    icon: computeFieldIcon(hass, fossil, "mdi:leaf"),
    has,
    hasPercentage: has,
    state: { power: has ? balance.flows.nonFossilToHome : null },
    display: has ? nonFossilText(context) : "",
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
