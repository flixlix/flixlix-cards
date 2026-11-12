import { type HomeAssistant } from "custom-card-helpers";

type Ids = string | string[];

/** Zones picked as Home Assistant's target picker picks them. */
export type ZoneTarget = {
  entity_id?: Ids;
  device_id?: Ids;
  area_id?: Ids;
  floor_id?: Ids;
  label_id?: Ids;
};

/**
 * Where the person of whoever looks at the card is. Home Assistant 2026.11's editor writes
 * `target`, `match_mode` and `away`; `locations` is the older format.
 */
export type LocationCondition = {
  condition: "location";
  /** `home`, `not_home` or a zone's name: the person's state. */
  locations?: string[];
  target?: ZoneTarget & { exclude?: ZoneTarget };
  /** `any_zone`, the default, also matches a zone the person is in that is not their state. */
  match_mode?: "any_zone" | "active_zone";
  /** Matches the person's `not_home`. */
  away?: boolean;
};

/** The registries Home Assistant's frontend puts on `hass`, as far as zones need them. */
type Registries = {
  entities?: Record<string, { area_id?: string | null; labels?: string[] }>;
  areas?: Record<string, { floor_id?: string | null; labels?: string[] }>;
};

const idsOf = (value: Ids | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const isIds = (value: unknown) =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((id) => typeof id === "string"));

const TARGET_KEYS = new Set(["entity_id", "device_id", "area_id", "floor_id", "label_id"]);

/** Like Home Assistant, a target that is not a mapping of target keys to ids picks nothing. */
const isTarget = (
  value: unknown,
  withExclude = true
): value is ZoneTarget & { exclude?: ZoneTarget } =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.entries(value).every(([key, ids]) =>
    key === "exclude" ? withExclude && isTarget(ids, false) : TARGET_KEYS.has(key) && isIds(ids)
  );

/**
 * The zones a target picks: by id, by their own area or label, or through an area its floor or
 * label picks. Zones have no device, so a device picks none.
 */
const pickedZones = (hass: HomeAssistant, target: ZoneTarget): Set<string> => {
  const { entities = {}, areas = {} } = hass as HomeAssistant & Registries;
  const labels = new Set(idsOf(target.label_id));
  const floors = new Set(idsOf(target.floor_id));
  const pickedAreas = new Set([
    ...idsOf(target.area_id),
    ...Object.keys(areas).filter((id) => {
      const area = areas[id];
      return (
        Boolean(area?.floor_id && floors.has(area.floor_id)) ||
        Boolean(area?.labels?.some((label) => labels.has(label)))
      );
    }),
  ]);
  const direct = new Set(idsOf(target.entity_id));
  const zones = new Set(
    [...Object.keys(entities), ...Object.keys(hass.states)].filter((id) => id.startsWith("zone."))
  );
  return new Set(
    [...zones].filter((id) => {
      const entry = entities[id];
      return (
        direct.has(id) ||
        Boolean(entry?.labels?.some((label) => labels.has(label))) ||
        Boolean(entry?.area_id && pickedAreas.has(entry.area_id))
      );
    })
  );
};

/** The zones a target picks, but those its `exclude` picks, that have a state now. */
const targetZones = (hass: HomeAssistant, target: ZoneTarget & { exclude?: ZoneTarget }) => {
  const excluded = target.exclude ? pickedZones(hass, target.exclude) : new Set<string>();
  return [...pickedZones(hass, target)].filter((id) => !excluded.has(id) && id in hass.states);
};

/** The person's state while a zone is their active zone; a passive zone never is. */
const activeZoneState = (hass: HomeAssistant, zone: string): string | undefined => {
  const state = hass.states[zone];
  if (!state || state.attributes.passive) {
    return undefined;
  }
  return zone === "zone.home" ? "home" : state.attributes.friendly_name;
};

/** The person entity of the user looking at the card. */
const userPerson = (hass: HomeAssistant) =>
  Object.values(hass.states).find(
    (entity) =>
      entity.entity_id.startsWith("person.") &&
      hass.user?.id !== undefined &&
      entity.attributes.user_id === hass.user.id
  );

/** Whether whoever looks at the card is where the condition says, as Home Assistant checks it. */
export const locationMet = (hass: HomeAssistant, condition: LocationCondition): boolean => {
  const person = userPerson(hass);
  if (!person) {
    return false;
  }
  if (condition.locations?.includes(person.state)) {
    return true;
  }
  // a passive zone leaves the state `not_home`, so this holds while the person is in one
  if (condition.away === true && person.state === "not_home") {
    return true;
  }
  if (!isTarget(condition.target)) {
    return false;
  }
  const zones = targetZones(hass, condition.target);
  const inZones: unknown = person.attributes.in_zones;
  // a legacy device tracker reports no zones: its state, the active zone's name, is all there is
  if (!Array.isArray(inZones) || inZones.length === 0) {
    return (
      person.state !== "not_home" &&
      zones.some((zone) => activeZoneState(hass, zone) === person.state)
    );
  }
  if (condition.match_mode === "active_zone") {
    // zone names are not unique, so find the zone that set the state among those the person is in
    const active = inZones.find(
      (zone): zone is string =>
        typeof zone === "string" && activeZoneState(hass, zone) === person.state
    );
    return active !== undefined && zones.includes(active);
  }
  return inZones.some((zone) => typeof zone === "string" && zones.includes(zone));
};
