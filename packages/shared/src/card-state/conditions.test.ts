import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { type Condition, conditionEntities, conditionsMet } from "./conditions";

const entity = (state: string) => ({
  entity_id: "",
  state,
  attributes: {},
  last_changed: "",
  last_updated: "",
  context: { id: "", user_id: null, parent_id: null },
});

const hass = (states: Record<string, string>, userId = "luca"): HomeAssistant => {
  const partialHass: Partial<HomeAssistant> = {
    states: {
      ...Object.fromEntries(Object.entries(states).map(([id, state]) => [id, entity(state)])),
      "person.luca": {
        ...entity(states["person.luca"] ?? "home"),
        entity_id: "person.luca",
        attributes: { user_id: "luca" },
      },
    },
    user: {
      id: userId,
      name: userId,
      is_admin: false,
      is_owner: false,
      credentials: [],
      mfa_modules: [],
    },
  };
  return partialHass as HomeAssistant;
};

/** A wide screen, on Monday 8 November 2026 at 21:30. */
const wide = {
  matchesMedia: (query: string) => query === "(min-width: 768px)",
  now: () => new Date(2026, 10, 9, 21, 30),
};
const met = (conditions: Condition[], states: Record<string, string>) =>
  conditionsMet(conditions, hass(states), wide);

describe("conditions", () => {
  test("a state condition holds when the entity reads one of the states", () => {
    const home: Condition = { condition: "state", entity: "device_tracker.car", state: "home" };
    expect(met([home], { "device_tracker.car": "home" })).toBe(true);
    expect(met([home], { "device_tracker.car": "not_home" })).toBe(false);
    expect(met([{ ...home, state: ["home", "garage"] }], { "device_tracker.car": "garage" })).toBe(
      true
    );
  });

  test("state_not holds for any other state, but not for a missing entity", () => {
    const away: Condition = { condition: "state", entity: "device_tracker.car", state_not: "home" };
    expect(met([away], { "device_tracker.car": "work" })).toBe(true);
    expect(met([away], { "device_tracker.car": "home" })).toBe(false);
    expect(met([away], {})).toBe(false);
  });

  test("a numeric state lies strictly between above and below, which may name entities", () => {
    const charging: Condition = {
      condition: "numeric_state",
      entity: "sensor.wallbox",
      above: "input_number.threshold",
      below: 11000,
    };
    const states = { "input_number.threshold": "50" };
    expect(met([charging], { ...states, "sensor.wallbox": "7400" })).toBe(true);
    expect(met([charging], { ...states, "sensor.wallbox": "50" })).toBe(false);
    expect(met([charging], { ...states, "sensor.wallbox": "unavailable" })).toBe(false);
  });

  test("screen and user conditions follow the screen and who is looking", () => {
    expect(met([{ condition: "screen", media_query: "(min-width: 768px)" }], {})).toBe(true);
    expect(met([{ condition: "user", users: ["luca"] }], {})).toBe(true);
    expect(met([{ condition: "user", users: ["partner"] }], {})).toBe(false);
  });

  test("and, or and not combine conditions; an empty list always holds", () => {
    const home: Condition = { condition: "state", entity: "device_tracker.car", state: "home" };
    const plugged: Condition = { condition: "state", entity: "binary_sensor.cable", state: "on" };
    const states = { "device_tracker.car": "home", "binary_sensor.cable": "off" };
    expect(met([{ condition: "or", conditions: [home, plugged] }], states)).toBe(true);
    expect(met([{ condition: "and", conditions: [home, plugged] }], states)).toBe(false);
    expect(met([{ condition: "not", conditions: [plugged] }], states)).toBe(true);
    expect(met([], states)).toBe(true);
  });

  test("the entities conditions read, nested ones and entity thresholds included", () => {
    expect(
      conditionEntities([
        { condition: "state", entity: "device_tracker.car", state: "home" },
        {
          condition: "or",
          conditions: [
            { condition: "numeric_state", entity: "sensor.wallbox", above: "input_number.min" },
            { condition: "screen", media_query: "(min-width: 768px)" },
          ],
        },
      ])
    ).toEqual(["device_tracker.car", "sensor.wallbox", "input_number.min"]);
  });

  test("time holds within its range, past midnight too, and on its weekdays", () => {
    expect(met([{ condition: "time", after: "18:00", before: "23:00" }], {})).toBe(true);
    expect(met([{ condition: "time", after: "22:00", before: "06:00" }], {})).toBe(false);
    expect(met([{ condition: "time", after: "21:00", before: "06:00" }], {})).toBe(true);
    expect(met([{ condition: "time", before: "21:30:00" }], {})).toBe(false);
    expect(met([{ condition: "time", weekdays: ["sat", "sun"] }], {})).toBe(false);
    expect(met([{ condition: "time", weekdays: ["mon"] }], {})).toBe(true);
  });

  test("location follows the person of the user looking at the card", () => {
    const atHome: Condition = { condition: "location", locations: ["home"] };
    expect(met([atHome], { "person.luca": "home" })).toBe(true);
    expect(met([atHome], { "person.luca": "work" })).toBe(false);
  });
});
