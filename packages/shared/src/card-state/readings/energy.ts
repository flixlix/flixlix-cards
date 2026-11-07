import { type FossilEnergyConsumption } from "@flixlix-cards/shared/states/utils/energy-period";
import { type ComboEntity, type EnergyFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWh } from "@flixlix-cards/shared/states/utils/get-entity-state-wh";
import { getEntityNames } from "@flixlix-cards/shared/states/utils/mutli-entity";
import { type HomeAssistant } from "custom-card-helpers";
import { type Readings } from "../types";

type ComboReading = Record<keyof ComboEntity, number | null>;
type Read = (entity?: string) => number | null;
type TwoWayField = { entity?: string | ComboEntity; invert_state?: boolean } | undefined;

/**
 * A single entity counts towards `single` (grid import, battery charge), or the other direction
 * with `invert_state`; split entities are read separately.
 */
const twoWay = (read: Read, field: TwoWayField, single: keyof ComboEntity): ComboReading => {
  const entity = field?.entity;
  if (typeof entity !== "string") {
    return { consumption: read(entity?.consumption), production: read(entity?.production) };
  }
  const value = read(entity);
  const isConsumption = (single === "consumption") !== !!field?.invert_state;
  return { consumption: isConsumption ? value : 0, production: isConsumption ? 0 : value };
};

const absolute = (value: number | null) => (value === null ? null : Math.abs(value));

/** Growth over the period, or null when a statistic is missing from the growth map. */
const periodGrowth = (growthMap: Record<string, number>, entity: string | undefined) => {
  if (!entity) {
    return null;
  }
  let sum = 0;
  for (const id of getEntityNames(entity)) {
    const growth = growthMap[id];
    if (growth === undefined) {
      return null;
    }
    sum += growth;
  }
  return sum;
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
  const grid = twoWay(read, entities.grid, "consumption");
  const battery = twoWay(read, entities.battery, "production");
  const generator = entities.grid?.power_outage?.entity_generator;
  return {
    status: "ready",
    family: "energy",
    grid: { fromGrid: grid.consumption, toGrid: grid.production },
    solar: { total: read(entities.solar?.entity), secondary: 0 },
    battery: { toBattery: battery.production, fromBattery: battery.consumption },
    home: entities.home?.override_state && entities.home.entity ? read(entities.home.entity) : null,
    generator: generator ? read(generator) : null,
    individuals: (entities.individual ?? []).map((individual) =>
      individual?.entity ? absolute(read(individual.entity)) : null
    ),
    fossilEnergyConsumption,
  };
}
