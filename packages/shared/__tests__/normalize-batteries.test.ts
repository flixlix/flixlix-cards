import { describe, expect, test } from "vitest";

import {
  getBatteryDisplayZeroTolerance,
  getDistributionBatteries,
  getPrimaryBattery,
  getSatelliteBatteries,
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

  test("splits primary and satellite roles for distribution", () => {
    const batteries = [
      { entity: "sensor.main", role: "primary" as const },
      { entity: "sensor.plug", role: "satellite" as const },
      { entity: "sensor.garage", role: "satellite" as const },
    ];
    expect(getDistributionBatteries(batteries).map((b) => b.entity)).toEqual(["sensor.main"]);
    expect(getSatelliteBatteries(batteries).map((b) => b.entity)).toEqual([
      "sensor.plug",
      "sensor.garage",
    ]);
    expect(getPrimaryBattery(batteries)?.entity).toBe("sensor.main");
    expect(getBatteryDisplayZeroTolerance(batteries)).toBe(0);
  });

  test("falls back to all batteries when every pack is marked satellite", () => {
    const batteries = [
      { entity: "sensor.a", role: "satellite" as const },
      { entity: "sensor.b", role: "satellite" as const },
    ];
    expect(getDistributionBatteries(batteries)).toHaveLength(2);
    expect(getSatelliteBatteries(batteries)).toHaveLength(0);
  });
});
