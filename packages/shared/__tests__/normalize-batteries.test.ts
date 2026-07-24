import { describe, expect, test } from "vitest";

import {
  getBatteryDisplayZeroTolerance,
  getPrimaryBattery,
  hasBatteryEntity,
  MAX_VISIBLE_BATTERIES,
  normalizeBatteries,
  serializeBatteries,
  toBatteryList,
} from "../src/utils/normalize-batteries";

describe("normalize-batteries", () => {
  test("toBatteryList normalizes object and array forms", () => {
    expect(toBatteryList(undefined)).toEqual([]);
    expect(toBatteryList({ entity: "sensor.a" })).toEqual([{ entity: "sensor.a" }]);
    expect(
      toBatteryList([{ entity: "sensor.a" }, { entity: "sensor.b" }, { entity: "sensor.c" }])
    ).toHaveLength(3);
  });

  test("normalizeBatteries filters empty entities and caps at max", () => {
    const list = normalizeBatteries([
      { entity: "sensor.a" },
      { entity: "" },
      { entity: { consumption: "sensor.out", production: "sensor.in" } },
      { entity: "sensor.d" },
      { entity: "sensor.e" },
    ]);
    expect(list).toHaveLength(MAX_VISIBLE_BATTERIES);
    expect(list.map((battery) => battery.entity)).toEqual([
      "sensor.a",
      { consumption: "sensor.out", production: "sensor.in" },
      "sensor.d",
    ]);
  });

  test("hasBatteryEntity supports string and split entities", () => {
    expect(hasBatteryEntity({ entity: "sensor.a" })).toBe(true);
    expect(hasBatteryEntity({ entity: { consumption: "sensor.out", production: "" } })).toBe(true);
    expect(hasBatteryEntity({ entity: { consumption: "", production: "" } })).toBe(false);
    expect(hasBatteryEntity({ entity: "" })).toBe(false);
  });

  test("getPrimaryBattery and tolerance helpers", () => {
    expect(getPrimaryBattery(undefined)).toBeUndefined();
    expect(getPrimaryBattery({ entity: "sensor.a", display_zero_tolerance: 5 })?.entity).toBe(
      "sensor.a"
    );
    expect(
      getBatteryDisplayZeroTolerance([
        { entity: "sensor.a", display_zero_tolerance: 2 },
        { entity: "sensor.b", display_zero_tolerance: 8 },
      ])
    ).toBe(8);
  });

  test("serializeBatteries collapses single battery to object", () => {
    expect(serializeBatteries([])).toBeUndefined();
    expect(serializeBatteries([{ entity: "sensor.a" }])).toEqual({ entity: "sensor.a" });
    expect(serializeBatteries([{ entity: "sensor.a" }, { entity: "sensor.b" }])).toEqual([
      { entity: "sensor.a" },
      { entity: "sensor.b" },
    ]);
  });
});
