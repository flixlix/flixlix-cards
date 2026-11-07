import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type ComboEntity, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type ReadyReadings } from "../types";

const onlyNegative = (value: number | null) =>
  value === null ? null : Math.abs(Math.min(value, 0));
const onlyPositive = (value: number | null) => (value === null ? null : Math.max(value, 0));

const absolute = (value: number | null) => (value === null ? null : Math.abs(value));

/** Reading in W, or null while the entity is unavailable or not numeric. */
const watts = (hass: HomeAssistant, entity: string | undefined): number | null =>
  getEntityState(hass, entity) === null ? null : getEntityStateWatts(hass, entity);

type TwoWayField = { entity?: string | ComboEntity; invert_state?: boolean } | undefined;

/** A single two-way entity reads positive outwards (grid import, battery discharge). */
const twoWay = (hass: HomeAssistant, field: TwoWayField) => {
  const entity = field?.entity;
  if (entity === undefined) {
    return { in: null, out: null };
  }
  if (typeof entity !== "string") {
    return {
      in: watts(hass, entity.production),
      out: watts(hass, entity.consumption),
    };
  }
  const reading = watts(hass, entity);
  return field?.invert_state
    ? { in: onlyPositive(reading), out: onlyNegative(reading) }
    : { in: onlyNegative(reading), out: onlyPositive(reading) };
};

const solarReading = (hass: HomeAssistant, config: FlowCardPlusConfig) => {
  const solar = config.entities.solar;
  if (solar?.entity === undefined) {
    return { total: null, secondary: 0 };
  }
  const secondaryEntity = solar.secondary_info?.entity;
  const secondary =
    solar.secondary_info?.sum_total && secondaryEntity
      ? Math.max(getEntityStateWatts(hass, secondaryEntity), 0)
      : 0;
  const production = watts(hass, solar.entity);
  const total = production === null && !secondary ? null : (production ?? 0) + secondary;
  return { total: solar.invert_state ? onlyNegative(total) : onlyPositive(total), secondary };
};

/** Live power readings in W from `hass.states`. */
export function powerReadings(hass: HomeAssistant, config: FlowCardPlusConfig): ReadyReadings {
  const { entities } = config;
  const grid = twoWay(hass, entities.grid);
  const battery = twoWay(hass, entities.battery);
  const generator = entities.grid?.power_outage?.entity_generator;
  return {
    status: "ready",
    family: "power",
    grid: { fromGrid: grid.out, toGrid: grid.in },
    solar: solarReading(hass, config),
    battery: { toBattery: battery.in, fromBattery: battery.out },
    home:
      entities.home?.override_state && entities.home.entity
        ? watts(hass, entities.home.entity)
        : null,
    generator: generator ? watts(hass, generator) : null,
    individuals: (entities.individual ?? []).map((individual) =>
      individual?.entity ? absolute(watts(hass, individual.entity)) : null
    ),
  };
}
