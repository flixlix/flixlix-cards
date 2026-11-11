import { type ComboEntity, type ConfigEntities } from "../types";
import { type HomeAssistant } from "custom-card-helpers";

export type UnitFamily = "power" | "energy";

/** How the user picked a power sensor in the energy dashboard, before HA normalises it. */
type PowerConfig = {
  stat_rate?: string;
  stat_rate_inverted?: string;
  stat_rate_from?: string;
  stat_rate_to?: string;
};

type PowerSource = { stat_rate?: string; power_config?: PowerConfig };

type GridSource = PowerSource & {
  type: "grid";
  stat_energy_from?: string | null;
  stat_energy_to?: string | null;
  /** Older HA versions kept one grid source holding lists of meters. */
  flow_from?: { stat_energy_from: string }[];
  flow_to?: { stat_energy_to: string }[];
  power?: PowerSource[];
};

type SolarSource = { type: "solar"; stat_energy_from: string; stat_rate?: string };

type BatterySource = PowerSource & {
  type: "battery";
  stat_energy_from: string;
  stat_energy_to: string;
  stat_soc?: string;
};

type DeviceConsumption = {
  stat_consumption: string;
  stat_rate?: string;
  name?: string;
  included_in_stat?: string;
};

export type EnergyPreferences = {
  energy_sources: (GridSource | SolarSource | BatterySource | { type: "gas" | "water" | "home" })[];
  device_consumption: DeviceConsumption[];
};

const isNotFound = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "not_found";

/** The energy dashboard's configuration, or null when the user never set it up. */
export const fetchEnergyPreferences = async (
  hass: HomeAssistant
): Promise<EnergyPreferences | null> => {
  try {
    return await hass.callWS<EnergyPreferences>({ type: "energy/get_prefs" });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
};

type TwoWayEntity = { entity: string | ComboEntity; invert_state?: boolean };

const existing = (hass: HomeAssistant, ids: (string | null | undefined)[]): string[] =>
  ids.filter((id): id is string => !!id && id in hass.states);

/**
 * Joins entities with `|` so the card sums them. A sum is only meaningful in one unit, so
 * entities in another unit than the first are left out.
 */
const sumOf = (hass: HomeAssistant, ids: (string | null | undefined)[]): string | undefined => {
  const found = existing(hass, ids);
  const unit = found[0] && hass.states[found[0]]?.attributes.unit_of_measurement;
  const sameUnit = found.filter((id) => hass.states[id]?.attributes.unit_of_measurement === unit);
  return sameUnit.length > 0 ? sameUnit.join(" | ") : undefined;
};

const comboOf = (
  hass: HomeAssistant,
  outOfNode: (string | null | undefined)[],
  intoNode: (string | null | undefined)[]
): TwoWayEntity | undefined => {
  const consumption = sumOf(hass, outOfNode);
  const production = sumOf(hass, intoNode);
  if (!consumption) {
    return undefined;
  }
  return { entity: production ? { consumption, production } : consumption };
};

/**
 * HA's `stat_rate` is positive out of the node, like the cards expect, but may be a sensor HA
 * generated from the user's own. With a single source, the user's own sensors read better.
 */
const powerOf = (hass: HomeAssistant, sources: PowerSource[]): TwoWayEntity | undefined => {
  const config = sources.length === 1 ? sources[0]?.power_config : undefined;
  if (config?.stat_rate && config.stat_rate in hass.states) {
    return { entity: config.stat_rate };
  }
  if (config?.stat_rate_inverted && config.stat_rate_inverted in hass.states) {
    return { entity: config.stat_rate_inverted, invert_state: true };
  }
  if (config?.stat_rate_from && config.stat_rate_to) {
    const combo = comboOf(hass, [config.stat_rate_from], [config.stat_rate_to]);
    if (combo) {
      return combo;
    }
  }
  const sum = sumOf(
    hass,
    sources.map((source) => source.stat_rate)
  );
  return sum ? { entity: sum } : undefined;
};

const gridPowerSources = (grid: GridSource): PowerSource[] => grid.power ?? [grid];

const gridOf = (
  hass: HomeAssistant,
  grids: GridSource[],
  family: UnitFamily
): TwoWayEntity | undefined => {
  if (family === "power") {
    return powerOf(hass, grids.flatMap(gridPowerSources));
  }
  return comboOf(
    hass,
    grids.flatMap((grid) => [
      grid.stat_energy_from,
      ...(grid.flow_from ?? []).map((flow) => flow.stat_energy_from),
    ]),
    grids.flatMap((grid) => [
      grid.stat_energy_to,
      ...(grid.flow_to ?? []).map((flow) => flow.stat_energy_to),
    ])
  );
};

const batteryOf = (
  hass: HomeAssistant,
  batteries: BatterySource[],
  family: UnitFamily
): (TwoWayEntity & { state_of_charge?: string }) | undefined => {
  const flow =
    family === "power"
      ? powerOf(hass, batteries)
      : comboOf(
          hass,
          batteries.map((battery) => battery.stat_energy_from),
          batteries.map((battery) => battery.stat_energy_to)
        );
  if (!flow) {
    return undefined;
  }
  const [stateOfCharge] = existing(
    hass,
    batteries.map((battery) => battery.stat_soc)
  );
  return stateOfCharge ? { ...flow, state_of_charge: stateOfCharge } : flow;
};

const solarOf = (hass: HomeAssistant, solars: SolarSource[], family: UnitFamily) => {
  const entity = sumOf(
    hass,
    solars.map((solar) => (family === "power" ? solar.stat_rate : solar.stat_energy_from))
  );
  return entity ? { entity } : undefined;
};

const MAX_DEVICES = 4;

/** Top-level devices: one counted inside another device's meter would be counted twice. */
export const energyDashboardDevices = (
  hass: HomeAssistant,
  preferences: EnergyPreferences,
  family: UnitFamily
): { entity: string; name?: string }[] =>
  preferences.device_consumption
    .filter((device) => !device.included_in_stat)
    .flatMap((device) => {
      const entity = family === "power" ? device.stat_rate : device.stat_consumption;
      if (!entity || !(entity in hass.states)) {
        return [];
      }
      return [device.name ? { entity, name: device.name } : { entity }];
    });

/** Grid, solar, battery and individual devices as the user set them up in the energy dashboard. */
export const energyDashboardEntities = (
  hass: HomeAssistant,
  preferences: EnergyPreferences,
  family: UnitFamily
): ConfigEntities => {
  const sources = preferences.energy_sources;
  const grid = gridOf(
    hass,
    sources.filter((source): source is GridSource => source.type === "grid"),
    family
  );
  const solar = solarOf(
    hass,
    sources.filter((source): source is SolarSource => source.type === "solar"),
    family
  );
  const battery = batteryOf(
    hass,
    sources.filter((source): source is BatterySource => source.type === "battery"),
    family
  );
  const individual = energyDashboardDevices(hass, preferences, family).slice(0, MAX_DEVICES);
  return {
    ...(grid && { grid }),
    ...(solar && { solar }),
    ...(battery && { battery }),
    ...(individual.length > 0 && { individual }),
  };
};
