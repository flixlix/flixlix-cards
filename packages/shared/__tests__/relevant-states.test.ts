import { describe, expect, test } from "vitest";

import { type ConfigEntities } from "../src/types";
import { collectConfigEntityIds } from "../src/utils/collect-config-entity-ids";
import {
  hasRelevantStatesChanged,
  type MinimalHass,
} from "../src/utils/has-relevant-states-changed";

// ---------------------------------------------------------------------------
// collectConfigEntityIds
// ---------------------------------------------------------------------------

describe("collectConfigEntityIds", () => {
  test("full config with ComboEntity grid, secondaries, and multiple individuals", () => {
    const entities: ConfigEntities = {
      grid: {
        entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" },
        secondary_info: { entity: "sensor.grid_secondary" },
        color_circle: "color_dynamically",
        power_outage: {
          entity: "binary_sensor.grid_outage",
          entity_generator: "sensor.generator",
        },
      },
      solar: {
        entity: "sensor.solar",
        secondary_info: { entity: "sensor.solar_secondary" },
      },
      battery: {
        entity: "sensor.battery",
        state_of_charge: "sensor.battery_soc",
        color_circle: "color_dynamically",
      },
      home: {
        entity: "sensor.home",
        secondary_info: { entity: "sensor.home_secondary" },
      },
      fossil_fuel_percentage: {
        entity: "sensor.fossil",
        secondary_info: { entity: "sensor.fossil_secondary" },
      },
      individual: [
        {
          entity: "sensor.individual1",
          secondary_info: { entity: "sensor.individual1_secondary" },
        },
        {
          entity: "sensor.individual2",
          // no secondary
        },
      ],
    };

    const ids = collectConfigEntityIds(entities);

    const expected = [
      "sensor.grid_in",
      "sensor.grid_out",
      "sensor.grid_secondary",
      "binary_sensor.grid_outage",
      "sensor.generator",
      "sensor.solar",
      "sensor.solar_secondary",
      "sensor.battery",
      "sensor.battery_soc",
      "sensor.home",
      "sensor.home_secondary",
      "sensor.fossil",
      "sensor.fossil_secondary",
      "sensor.individual1",
      "sensor.individual1_secondary",
      "sensor.individual2",
    ];

    // Every expected ID must be present
    for (const id of expected) {
      expect(ids).toContain(id);
    }

    // No extras beyond what we expect
    expect(ids).toHaveLength(expected.length);
  });

  test("minimal config returns only configured entity IDs", () => {
    const entities: ConfigEntities = {
      solar: { entity: "sensor.solar" },
    };
    const ids = collectConfigEntityIds(entities);
    expect(ids).toEqual(["sensor.solar"]);
  });

  test("no duplicates when the same entity appears multiple times", () => {
    const entities: ConfigEntities = {
      grid: {
        entity: "sensor.shared",
        secondary_info: { entity: "sensor.shared" },
        color_circle: "color_dynamically",
        power_outage: { entity: "sensor.shared" },
      },
    };
    const ids = collectConfigEntityIds(entities);
    expect(ids.filter((id) => id === "sensor.shared")).toHaveLength(1);
  });

  test("empty entities returns empty array", () => {
    expect(collectConfigEntityIds({})).toEqual([]);
  });

  test("individual1 / individual2 legacy fields are collected", () => {
    const entities: ConfigEntities = {
      individual1: [{ entity: "sensor.ind1" }],
      individual2: [{ entity: "sensor.ind2" }],
    };
    const ids = collectConfigEntityIds(entities);
    expect(ids).toContain("sensor.ind1");
    expect(ids).toContain("sensor.ind2");
  });
});

// ---------------------------------------------------------------------------
// hasRelevantStatesChanged
// ---------------------------------------------------------------------------

const makeHass = (
  states: Record<string, unknown>,
  locale?: unknown,
  themes?: unknown
): MinimalHass => ({ states, locale, themes });

const stateA = { state: "on" };
const stateB = { state: "on" }; // different object reference, same value
const stateC = { state: "on" }; // yet another

describe("hasRelevantStatesChanged", () => {
  test("returns false when the same hass object (no entity changes)", () => {
    const hass = makeHass({ "sensor.a": stateA });
    expect(hasRelevantStatesChanged(hass, hass, ["sensor.a"])).toBe(false);
  });

  test("returns false when new hass has same state references for watched entities", () => {
    const oldHass = makeHass({ "sensor.a": stateA, "sensor.irrelevant": stateB });
    const newHass = makeHass({ "sensor.a": stateA, "sensor.irrelevant": stateC });
    // "sensor.irrelevant" changed but is not in entityIds
    expect(hasRelevantStatesChanged(oldHass, newHass, ["sensor.a"])).toBe(false);
  });

  test("returns true when a relevant state object is replaced", () => {
    const oldHass = makeHass({ "sensor.a": stateA });
    const newHass = makeHass({ "sensor.a": stateB }); // different reference
    expect(hasRelevantStatesChanged(oldHass, newHass, ["sensor.a"])).toBe(true);
  });

  test("returns false when only an irrelevant entity changed", () => {
    const oldHass = makeHass({ "sensor.a": stateA, "sensor.b": stateA });
    const newHass = makeHass({ "sensor.a": stateA, "sensor.b": stateB });
    expect(hasRelevantStatesChanged(oldHass, newHass, ["sensor.a"])).toBe(false);
  });

  test("returns true when oldHass is undefined", () => {
    const newHass = makeHass({ "sensor.a": stateA });
    expect(hasRelevantStatesChanged(undefined, newHass, ["sensor.a"])).toBe(true);
  });

  test("returns true when locale reference changed", () => {
    const localeA = { language: "en" };
    const localeB = { language: "de" };
    const oldHass = makeHass({}, localeA);
    const newHass = makeHass({}, localeB);
    expect(hasRelevantStatesChanged(oldHass, newHass, [])).toBe(true);
  });

  test("returns false when locale object is the same reference", () => {
    const locale = { language: "en" };
    const oldHass = makeHass({}, locale);
    const newHass = makeHass({}, locale);
    expect(hasRelevantStatesChanged(oldHass, newHass, [])).toBe(false);
  });

  test("returns true when themes reference changed", () => {
    const themesA = {};
    const themesB = {};
    const oldHass = makeHass({}, undefined, themesA);
    const newHass = makeHass({}, undefined, themesB);
    expect(hasRelevantStatesChanged(oldHass, newHass, [])).toBe(true);
  });

  test("returns false when entityIds is empty and no locale/themes changes", () => {
    const hass = makeHass({ "sensor.a": stateA });
    expect(hasRelevantStatesChanged(hass, hass, [])).toBe(false);
  });
});
