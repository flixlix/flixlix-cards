import { type ComboEntity, type ConfigEntities } from "../types";
import { type HomeAssistant } from "custom-card-helpers";

export type UnitFamily = "power" | "energy";

/**
 * The parts of `energy/get_prefs` the cards use. HA keeps `stat_rate` positive out of the node
 * and pointed at a real entity, even when the user picked an inverted sensor or a pair.
 */
type EnergySource = {
  type: string;
  stat_energy_from?: string | null;
  stat_energy_to?: string | null;
  stat_rate?: string;
  stat_soc?: string;
};

export type EnergyPreferences = {
  energy_sources: EnergySource[];
  device_consumption: {
    stat_consumption: string;
    stat_rate?: string;
    name?: string;
    included_in_stat?: string;
  }[];
};

/** The energy dashboard's configuration, or null when the user never set it up. */
export const fetchEnergyPreferences = async (
  hass: HomeAssistant
): Promise<EnergyPreferences | null> => {
  try {
    return await hass.callWS<EnergyPreferences>({ type: "energy/get_prefs" });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "not_found") {
      return null;
    }
    throw error;
  }
};

const existing = (hass: HomeAssistant, ids: (string | null | undefined)[]): string[] =>
  ids.filter((id): id is string => !!id && id in hass.states);

/** Joins the existing entities with `|`, which the cards read as their sum. */
const sumOf = (hass: HomeAssistant, ids: (string | null | undefined)[]): string | undefined =>
  existing(hass, ids).join(" | ") || undefined;

/**
 * Power is one signed `stat_rate`; energy is two meters counting up, out of the node
 * (consumption: grid import, battery discharge) and into it.
 */
const flowOf = (
  hass: HomeAssistant,
  sources: EnergySource[],
  family: UnitFamily
): string | ComboEntity | undefined => {
  if (family === "power") {
    return sumOf(
      hass,
      sources.map((source) => source.stat_rate)
    );
  }
  const consumption = sumOf(
    hass,
    sources.map((source) => source.stat_energy_from)
  );
  const production = sumOf(
    hass,
    sources.map((source) => source.stat_energy_to)
  );
  return consumption && production ? { consumption, production } : consumption;
};

/** Top-level devices: one counted inside another device's meter would be counted twice. */
export const energyDashboardDevices = (
  hass: HomeAssistant,
  preferences: EnergyPreferences,
  family: UnitFamily
): { entity: string; name?: string }[] =>
  preferences.device_consumption.flatMap(
    ({ stat_consumption, stat_rate, name, included_in_stat }) => {
      const entity = family === "power" ? stat_rate : stat_consumption;
      if (!entity || !(entity in hass.states) || included_in_stat) {
        return [];
      }
      return [name ? { entity, name } : { entity }];
    }
  );

/** Grid, solar, battery and up to four devices as the user set them up in the energy dashboard. */
export const energyDashboardEntities = (
  hass: HomeAssistant,
  preferences: EnergyPreferences,
  family: UnitFamily
): ConfigEntities => {
  const sources = (type: string) =>
    preferences.energy_sources.filter((source) => source.type === type);
  const grid = flowOf(hass, sources("grid"), family);
  const solar = flowOf(hass, sources("solar"), family);
  const battery = flowOf(hass, sources("battery"), family);
  const [stateOfCharge] = existing(
    hass,
    sources("battery").map((source) => source.stat_soc)
  );
  const individual = energyDashboardDevices(hass, preferences, family).slice(0, 4);
  return {
    ...(grid && { grid: { entity: grid } }),
    ...(typeof solar === "string" && { solar: { entity: solar } }),
    ...(battery && {
      battery: stateOfCharge
        ? { entity: battery, state_of_charge: stateOfCharge }
        : { entity: battery },
    }),
    ...(individual.length > 0 && { individual }),
  };
};
