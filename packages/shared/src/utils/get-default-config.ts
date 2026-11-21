import { type ConfigEntities, type DisplayZeroLinesMode } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import {
  energyDashboardEntities,
  fetchEnergyPreferences,
  type UnitFamily,
} from "./energy-dashboard-entities";
import { withEntitiesByName } from "./entities-by-name";

export const defaultValues = {
  maxFlowRate: 6,
  minFlowRate: 0.75,
  baseDecimals: 0,
  kiloDecimals: 1,
  minExpectedPower: 0.01,
  maxExpectedPower: 2000,
  kiloThreshold: 1000,
  megaThreshold: 1000000,
  transparencyZeroLines: 0,
  displayZeroLines: {
    mode: "show" as DisplayZeroLinesMode,
    transparency: 50,
    grey_color: [189, 189, 189],
  },
};

/**
 * Entities for a new card: what the user set up in the energy dashboard, then a guess from entity
 * names for whatever it leaves out.
 */
const suggestedEntities = async (
  hass: HomeAssistant,
  family: UnitFamily
): Promise<ConfigEntities> => {
  const preferences = await fetchEnergyPreferences(hass);
  return withEntitiesByName(
    hass,
    family,
    preferences ? energyDashboardEntities(hass, preferences, family) : {}
  );
};

/** A new card's config: just its entities, since every other option already has a default. */
export async function getDefaultConfig(
  hass: HomeAssistant,
  family: UnitFamily = "power"
): Promise<{ entities: ConfigEntities }> {
  return { entities: await suggestedEntities(hass, family) };
}
