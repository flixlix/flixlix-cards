import { type ComboEntity, type ConfigEntities } from "../types";
import { type UnitFamily } from "./energy-dashboard-entities";
import { getEntityNames } from "../states/utils/mutli-entity";
import { isNumberValue, sortedCopy } from "./utils";
import { type HomeAssistant } from "custom-card-helpers";

const NODE_WORDS = {
  grid: ["grid", "utility", "net", "mains", "meter"],
  solar: ["solar", "pv", "photovoltaic"],
  battery: ["battery", "batt", "storage"],
} as const;

type NodeName = keyof typeof NODE_WORDS;
const NODES: NodeName[] = ["grid", "solar", "battery"];
type TwoWayNode = "grid" | "battery";

/** Words for a grid import or battery discharge. */
const OUT_OF_NODE: Record<TwoWayNode, string[]> = {
  grid: ["import", "imported", "consumption", "consumed", "purchased", "bought", "from"],
  battery: ["discharge", "discharging", "discharged"],
};

/** Words for a grid export or battery charge. */
const INTO_NODE: Record<TwoWayNode, string[]> = {
  grid: ["export", "exported", "return", "returned", "feed", "fed", "injection", "sold"],
  battery: ["charge", "charging", "charged"],
};

/** Sensors that measure power or energy but not what flows right now. */
const NOT_A_FLOW = ["forecast", "estimated", "predicted", "limit", "max", "min", "target"];

const UNIT: Record<UnitFamily, RegExp> = { power: /^[kMG]?W$/u, energy: /^[kMG]?Wh$/u };

type Sensor = { id: string; words: Set<string>; idWords: number };

const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);

const hasAny = (words: Set<string>, list: readonly string[]): boolean =>
  list.some((word) => words.has(word));

type EntityState = HomeAssistant["states"][string];

const idWordsOf = (state: EntityState): string[] =>
  wordsOf(state.entity_id.slice(state.entity_id.indexOf(".") + 1));

const sensorWords = (state: EntityState): Set<string> =>
  new Set([...idWordsOf(state), ...wordsOf(state.attributes.friendly_name ?? "")]);

const availableSensors = (hass: HomeAssistant): EntityState[] =>
  Object.values(hass.states).filter(
    (state) => state.entity_id.startsWith("sensor.") && isNumberValue(state.state)
  );

/** Sensors in the family's unit, plainest ID first. */
const sensorsOf = (hass: HomeAssistant, family: UnitFamily, used: Set<string>): Sensor[] =>
  sortedCopy(
    availableSensors(hass)
      .filter(
        (state) =>
          !used.has(state.entity_id) &&
          (state.attributes.device_class === family ||
            UNIT[family].test(state.attributes.unit_of_measurement ?? ""))
      )
      .map((state) => ({
        id: state.entity_id,
        words: sensorWords(state),
        idWords: idWordsOf(state).length,
      }))
      .filter((sensor) => !hasAny(sensor.words, NOT_A_FLOW)),
    (a, b) => a.idWords - b.idWords || a.id.localeCompare(b.id)
  );

/** The node a sensor's name points at, if exactly one: "battery grid charge" names neither. */
const nodeOf = (sensor: Sensor): NodeName | undefined => {
  const nodes = NODES.filter((node) => hasAny(sensor.words, NODE_WORDS[node]));
  return nodes.length === 1 ? nodes[0] : undefined;
};

const twoWayEntity = (
  node: TwoWayNode,
  sensors: Sensor[],
  family: UnitFamily
): string | ComboEntity | undefined => {
  const matches = sensors.filter((sensor) => nodeOf(sensor) === node);
  const outOf = (sensor: Sensor) => hasAny(sensor.words, OUT_OF_NODE[node]);
  const into = (sensor: Sensor) => hasAny(sensor.words, INTO_NODE[node]);
  const net = matches.find((sensor) => !outOf(sensor) && !into(sensor))?.id;
  const consumption = matches.find((sensor) => outOf(sensor) && !into(sensor))?.id;
  const production = matches.find((sensor) => into(sensor) && !outOf(sensor))?.id;
  const split = consumption && production ? { consumption, production } : undefined;
  // a meter counting up cannot go negative, so energy readings come in pairs
  return family === "energy" ? (split ?? net ?? consumption) : (net ?? split ?? consumption);
};

const entityIds = (entity: string | ComboEntity): string[] =>
  typeof entity === "string" ? [entity] : [entity.consumption, entity.production];

const isStateOfCharge = (words: Set<string>): boolean =>
  words.has("soc") || (words.has("state") && words.has("charge"));

/**
 * Prefers an explicit state of charge, then the percentage sensor sharing most words with the
 * battery's own entity, so a phone's battery level loses to the home battery's.
 */
const stateOfChargeFor = (
  hass: HomeAssistant,
  battery: string | ComboEntity
): string | undefined => {
  const batteryWords = new Set(
    entityIds(battery).flatMap((id) => wordsOf(id.slice(id.indexOf(".") + 1)))
  );
  const score = (words: Set<string>) =>
    (isStateOfCharge(words) ? 100 : 0) + [...words].filter((word) => batteryWords.has(word)).length;
  const candidates = availableSensors(hass)
    .filter(
      (state) =>
        state.attributes.device_class === "battery" || state.attributes.unit_of_measurement === "%"
    )
    .map((state) => ({ id: state.entity_id, words: sensorWords(state) }))
    .filter(({ words }) => isStateOfCharge(words) || hasAny(words, NODE_WORDS.battery));
  return sortedCopy(
    candidates,
    (a, b) => score(b.words) - score(a.words) || a.id.localeCompare(b.id)
  )[0]?.id;
};

const knownEntityIds = (known: ConfigEntities): Set<string> =>
  new Set(
    [known.grid, known.solar, known.battery, ...(known.individual ?? [])].flatMap((node) =>
      node?.entity ? entityIds(node.entity).flatMap(getEntityNames) : []
    )
  );

/**
 * Fills grid, solar, battery and its state of charge from entity IDs and friendly names where
 * `known` has none, without reusing an entity `known` already shows.
 */
export const withEntitiesByName = (
  hass: HomeAssistant,
  family: UnitFamily,
  known: ConfigEntities
): ConfigEntities => {
  const sensors = sensorsOf(hass, family, knownEntityIds(known));
  const gridEntity = known.grid ? undefined : twoWayEntity("grid", sensors, family);
  const solarEntity = known.solar
    ? undefined
    : sensors.find((sensor) => nodeOf(sensor) === "solar")?.id;
  const batteryEntity = known.battery ? undefined : twoWayEntity("battery", sensors, family);
  const battery = known.battery ?? (batteryEntity ? { entity: batteryEntity } : undefined);
  const stateOfCharge =
    battery?.entity && !battery.state_of_charge
      ? stateOfChargeFor(hass, battery.entity)
      : undefined;
  return {
    ...known,
    ...(gridEntity && { grid: { entity: gridEntity } }),
    ...(solarEntity && { solar: { entity: solarEntity } }),
    ...(battery && {
      battery: stateOfCharge ? { ...battery, state_of_charge: stateOfCharge } : battery,
    }),
  };
};
