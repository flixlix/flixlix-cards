import { type FossilEnergyConsumption } from "@flixlix-cards/shared/states/utils/energy-period";
import { type ComboEntity, type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWh } from "@flixlix-cards/shared/states/utils/get-entity-state-wh";
import { getEntityNames } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { type HomeAssistant } from "custom-card-helpers";
import { type Readings, type TwoWayReading } from "../types";
import { individualReading } from "./individual";

type Read = (entity?: string) => number | null;

const twoWay = (read: Read, entity: string | ComboEntity | undefined): TwoWayReading =>
  typeof entity === "string"
    ? { kind: "single", value: read(entity) }
    : { kind: "split", into: read(entity?.production), outOf: read(entity?.consumption) };

/** Growth over the period, or null when a statistic is missing from the growth map. */
const periodGrowth = (growthMap: Record<string, number>, entity: string | undefined) => {
  if (!entity) {
    return null;
  }
  const growths = getEntityNames(entity).map((id) => growthMap[id]);
  return growths.every((growth): growth is number => growth !== undefined)
    ? growths.reduce((sum, growth) => sum + growth, 0)
    : null;
};

/**
 * Energy readings in Wh over the selected energy period, from the period's statistics growth.
 * Without a growth map the card is still loading.
 */
export function energyReadings(
  hass: HomeAssistant,
  config: EnergyFlowCardPlusConfig,
  growthMap: Record<string, number> | undefined,
  fossilEnergyConsumption?: FossilEnergyConsumption
): Readings {
  if (!growthMap) {
    return { status: "loading" };
  }
  const read: Read =
    config.energy_date_selection === false
      ? (entity) =>
          entity && getEntityState(hass, entity) !== null ? getEntityStateWh(hass, entity) : null
      : (entity) => periodGrowth(growthMap, entity);
  const { entities } = config;
  const generator = entities.grid?.power_outage?.entity_generator;
  return {
    status: "ready",
    family: "energy",
    grid: twoWay(read, entities.grid?.entity),
    solar: { total: read(entities.solar?.entity), secondary: 0 },
    battery: twoWay(read, entities.battery?.entity),
    home: entities.home?.override_state && entities.home.entity ? read(entities.home.entity) : null,
    generator: generator ? read(generator) : null,
    individuals: (entities.individual ?? []).map((individual) =>
      individualReading(individual, read)
    ),
    auxiliary: individualReading(entities.auxiliary, read),
    fossilEnergyConsumption,
  };
}
