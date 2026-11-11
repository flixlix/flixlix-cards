import { type ConfigEntities } from "../types";
import { type UnitFamily } from "./energy-dashboard-entities";
import { isNumberValue, sortedCopy } from "./utils";
import { type HomeAssistant } from "custom-card-helpers";

const NODE_WORDS = {
  grid: ["grid", "utility", "net", "mains", "meter"],
  solar: ["solar", "pv", "photovoltaic"],
  battery: ["battery", "batt", "storage"],
};
type NodeName = keyof typeof NODE_WORDS;
const NODES: NodeName[] = ["grid", "solar", "battery"];

type Sensor = { id: string; words: string[] };

const hasAny = (words: string[], list: string[]): boolean =>
  list.some((word) => words.includes(word));

/**
 * Available sensors of a device class, as the whole words of their ID, shortest ID first.
 * Forecasts measure power too, but not what flows now.
 */
const sensorsOf = (hass: HomeAssistant, deviceClass: string): Sensor[] =>
  sortedCopy(
    Object.values(hass.states)
      .filter(
        ({ entity_id, state, attributes }) =>
          entity_id.startsWith("sensor.") &&
          isNumberValue(state) &&
          attributes.device_class === deviceClass
      )
      .map(({ entity_id }) => ({ id: entity_id, words: entity_id.split(/[._]/u) }))
      .filter(({ words }) => !words.includes("forecast")),
    (a, b) => a.id.length - b.id.length
  );

/**
 * Fills grid, solar, battery and its state of charge from entity IDs where
 * `known` has none. A sensor counts for a node only when its name points at no other node, so
 * `battery_grid_power` is left for the user to place.
 */
export const withEntitiesByName = (
  hass: HomeAssistant,
  family: UnitFamily,
  known: ConfigEntities
): ConfigEntities => {
  const sensors = sensorsOf(hass, family);
  const entities = { ...known };
  for (const node of NODES) {
    const id = sensors.find(
      ({ words }) => NODES.filter((other) => hasAny(words, NODE_WORDS[other])).join() === node
    )?.id;
    if (!entities[node] && id) {
      entities[node] = { entity: id };
    }
  }
  const battery = entities.battery;
  if (battery && !battery.state_of_charge) {
    const levels = sensorsOf(hass, "battery");
    const stateOfCharge =
      levels.find(({ words }) => words.includes("soc")) ??
      levels.find(({ words }) => hasAny(words, NODE_WORDS.battery));
    if (stateOfCharge) {
      entities.battery = { ...battery, state_of_charge: stateOfCharge.id };
    }
  }
  return entities;
};
