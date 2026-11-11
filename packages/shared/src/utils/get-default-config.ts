import {
  type ConfigEntities,
  type DisplayZeroLinesMode,
  type FlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
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

type SuggestedConfig = Pick<
  FlowCardPlusConfig,
  | "entities"
  | "clickable_entities"
  | "base_decimals"
  | "kilo_decimals"
  | "min_flow_rate"
  | "max_flow_rate"
  | "max_expected_power"
  | "min_expected_power"
  | "kilo_threshold"
  | "mega_threshold"
  | "transparency_zero_lines"
  | "sort_individual_devices"
>;

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

export async function getDefaultConfig(
  hass: HomeAssistant,
  family: UnitFamily = "power"
): Promise<SuggestedConfig> {
  const entities = await suggestedEntities(hass, family);
  return {
    entities: entities.solar
      ? { ...entities, solar: { ...entities.solar, display_zero_state: true } }
      : entities,
    clickable_entities: true,
    base_decimals: defaultValues.baseDecimals,
    kilo_decimals: defaultValues.kiloDecimals,
    min_flow_rate: defaultValues.minFlowRate,
    max_flow_rate: defaultValues.maxFlowRate,
    max_expected_power: defaultValues.maxExpectedPower,
    min_expected_power: defaultValues.minExpectedPower,
    kilo_threshold: defaultValues.kiloThreshold,
    mega_threshold: defaultValues.megaThreshold,
    transparency_zero_lines: defaultValues.transparencyZeroLines,
    sort_individual_devices: true,
  };
}
