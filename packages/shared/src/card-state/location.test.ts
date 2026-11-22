import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { type LocationCondition, locationMet } from "./location";

const entity = (entityId: string, state: string, attributes: Record<string, unknown> = {}) => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: "",
  last_updated: "",
  context: { id: "", user_id: null, parent_id: null },
});

/** Luca looking at the card, their person in `state` and `inZones`, among home, work and a park. */
const hass = (state: string, inZones?: string[]): HomeAssistant => {
  const states = Object.fromEntries(
    [
      entity("person.luca", state, { user_id: "luca", ...(inZones && { in_zones: inZones }) }),
      entity("zone.home", "0", { friendly_name: "Home" }),
      entity("zone.work", "0", { friendly_name: "Work" }),
      entity("zone.park", "0", { friendly_name: "Park", passive: true }),
    ].map((stateObj) => [stateObj.entity_id, stateObj])
  );
  const partialHass: Partial<HomeAssistant> & Record<string, unknown> = {
    states,
    user: {
      id: "luca",
      name: "Luca",
      is_admin: false,
      is_owner: false,
      credentials: [],
      mfa_modules: [],
    },
    entities: {
      "zone.work": { area_id: "office", labels: [] },
      "zone.park": { area_id: null, labels: ["outdoors"] },
    },
    areas: { office: { floor_id: "ground", labels: [] } },
  };
  return partialHass as HomeAssistant;
};

const at = (condition: Omit<LocationCondition, "condition">, state: HomeAssistant) =>
  locationMet(state, { condition: "location", ...condition });

describe("location", () => {
  test("the older `locations` match the person's state", () => {
    expect(at({ locations: ["home"] }, hass("home", ["zone.home"]))).toBe(true);
    expect(at({ locations: ["home"] }, hass("Work", ["zone.work"]))).toBe(false);
  });

  test("any zone the person is in matches, a passive one too, unless only the active one may", () => {
    const inPark = hass("Work", ["zone.work", "zone.park"]);
    const park = { target: { entity_id: "zone.park" } };
    expect(at(park, inPark)).toBe(true);
    expect(at({ ...park, match_mode: "active_zone" }, inPark)).toBe(false);
    expect(at({ target: { entity_id: ["zone.work"] }, match_mode: "active_zone" }, inPark)).toBe(
      true
    );
  });

  test("away matches not_home, in a passive zone too", () => {
    expect(at({ away: true }, hass("not_home", ["zone.park"]))).toBe(true);
    expect(at({ away: true }, hass("home", ["zone.home"]))).toBe(false);
  });

  test("zones are picked by their area, its floor, or a label, less the excluded ones", () => {
    const atWork = hass("Work", ["zone.work"]);
    expect(at({ target: { area_id: "office" } }, atWork)).toBe(true);
    expect(at({ target: { floor_id: "ground" } }, atWork)).toBe(true);
    expect(at({ target: { label_id: "outdoors" } }, hass("Work", ["zone.park"]))).toBe(true);
    expect(
      at({ target: { floor_id: "ground", exclude: { entity_id: "zone.work" } } }, atWork)
    ).toBe(false);
  });

  test("a tracker that reports no zones matches by the active zone's name, never while away", () => {
    expect(at({ target: { entity_id: "zone.work" } }, hass("Work"))).toBe(true);
    expect(at({ target: { entity_id: "zone.home" } }, hass("home"))).toBe(true);
    expect(at({ target: { entity_id: "zone.work" } }, hass("not_home"))).toBe(false);
  });

  test("a target that is not one picks nothing", () => {
    const target = { entity_id: "zone.work", zone: "zone.work" };
    expect(at({ target }, hass("Work", ["zone.work"]))).toBe(false);
  });
});
