import { type FossilEnergyConsumption } from "@flixlix-cards/shared/states/utils/energy-period";
import {
  type ComboEntity,
  type EnergyFlowCardPlusConfig,
  type IndividualDeviceType,
} from "@flixlix-cards/shared/types";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWh } from "@flixlix-cards/shared/states/utils/get-entity-state-wh";
import {
  getEntityNames,
  getFirstEntityName,
} from "@flixlix-cards/shared/states/utils/mutli-entity";
import { powerUnitFactor } from "@flixlix-cards/shared/states/utils/unit-prefix";
import { type HomeAssistant } from "custom-card-helpers";
import { type EntityReader, type Readings, type TwoWayReading } from "../types";
import { individualReading } from "./individual";

const twoWay = (read: EntityReader, entity: string | ComboEntity | undefined): TwoWayReading =>
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
 * Readings in Wh: each entity's growth over the selected energy period, or without
 * `followPeriod` its own state. Growth that went down over the period reads 0 unless `signed`.
 */
export const energyReader = (
  hass: HomeAssistant,
  growthMap: Record<string, number>,
  followPeriod: boolean,
  { signed = false }: { signed?: boolean } = {}
): EntityReader =>
  followPeriod
    ? (entity) => {
        const growth = periodGrowth(growthMap, entity);
        return growth === null || signed ? growth : Math.max(growth, 0);
      }
    : (entity) =>
        entity && getEntityState(hass, entity) !== null ? getEntityStateWh(hass, entity) : null;

const isEnergyEntity = (hass: HomeAssistant, entity: string) => {
  const unit = hass.states[getFirstEntityName(entity)]?.attributes.unit_of_measurement ?? "";
  return unit.endsWith("Wh") && powerUnitFactor(unit) !== undefined;
};

/**
 * A device's secondary entity over the period, or null to show its live state: while the card
 * ignores the period, and for secondaries that are no energy meter, such as a temperature.
 */
const periodSecondary = (
  hass: HomeAssistant,
  device: IndividualDeviceType | undefined,
  readers: { read: EntityReader; signed: EntityReader },
  followPeriod: boolean
): number | null => {
  const info = device?.secondary_info;
  if (!followPeriod || !info?.entity || !isEnergyEntity(hass, info.entity)) {
    return null;
  }
  return (info.accept_negative ? readers.signed : readers.read)(info.entity);
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
  const followPeriod = config.energy_date_selection !== false;
  const read = energyReader(hass, growthMap, followPeriod);
  const signed = energyReader(hass, growthMap, followPeriod, { signed: true });
  const deviceReader = (device: IndividualDeviceType | undefined) =>
    device?.accept_negative ? signed : read;
  const secondary = (device: IndividualDeviceType | undefined) =>
    periodSecondary(hass, device, { read, signed }, followPeriod);
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
      individualReading(individual, deviceReader(individual))
    ),
    auxiliary: individualReading(entities.auxiliary, deviceReader(entities.auxiliary)),
    periodSecondaries: {
      individuals: (entities.individual ?? []).map(secondary),
      auxiliary: secondary(entities.auxiliary),
    },
    fossilEnergyConsumption,
  };
}
