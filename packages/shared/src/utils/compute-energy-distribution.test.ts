import { describe, expect, test } from "vite-plus/test";
import { computeEnergyDistribution } from "./compute-energy-distribution";

describe("compute-energy-distribution", () => {
  test("computeEnergyDistribution applies display zero tolerance to grid/battery exchange", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 10, toGrid: 5, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: true,
      state: { total: 0, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: true,
      state: { fromBattery: 6, toBattery: 2, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: false, hasPercentage: false, state: { power: 0 } };

    computeEnergyDistribution({
      entities: {
        grid: { display_zero_tolerance: 6 },
        battery: { display_zero_tolerance: 6 },
      },
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateValue: () => 0,
      getEntityState: () => 0,
    });

    expect(grid.state.toBattery).toBe(0);
    expect(battery.state.toGrid).toBe(0);
    expect(grid.state.toHome).toBe(8);
    expect(battery.state.toHome).toBe(1);
  });

  test("computeEnergyDistribution uses fossil collection values for non-fossil power", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 1000, toGrid: 0, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: false,
      state: { total: 0, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: false,
      state: { fromBattery: 0, toBattery: 0, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: true, hasPercentage: true, state: { power: 0 } };

    computeEnergyDistribution({
      entities: {
        fossil_fuel_percentage: { entity: "sensor.fossil" },
      },
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateValue: () => 0,
      getEntityState: () => 40,
      fossilEnergyConsumption: { coal: 0.2 },
    });

    expect(grid.state.toHome).toBe(1000);
    expect(nonFossil.state.power).toBe(800);
  });
});

describe("energy distribution", () => {
  test("allows import and export in same period", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 12, toGrid: 5, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: true,
      state: { total: 10, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: true,
      state: { fromBattery: 8, toBattery: 4, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: true, hasPercentage: true, state: { power: 0 } };

    computeEnergyDistribution({
      entities: {
        grid: { display_zero_tolerance: 0 },
        battery: { display_zero_tolerance: 0 },
        solar: { display_zero_tolerance: 0 },
        fossil_fuel_percentage: { entity: "sensor.fossil" },
      },
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateValue: () => 0,
      getEntityState: () => 40,
    });

    expect(grid.state.toHome).toBeGreaterThan(0);
    expect(solar.state.toGrid).toBeGreaterThanOrEqual(0);
    expect(battery.state.toGrid).toBeGreaterThanOrEqual(0);
    expect(solar.state.toBattery).toBeGreaterThanOrEqual(0);
  });

  test("computes deterministic split for mixed totals", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 20, toGrid: 4, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: true,
      state: { total: 18, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: true,
      state: { fromBattery: 6, toBattery: 7, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: false, hasPercentage: false, state: { power: 0 } };

    computeEnergyDistribution({
      entities: {},
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateValue: () => 0,
      getEntityState: () => 0,
    });

    expect(grid.state.toBattery).toBe(0);
    expect(solar.state.toBattery).toBe(7);
    expect(solar.state.toGrid).toBe(4);
    expect(solar.state.toHome).toBe(7);
    expect(battery.state.toHome).toBe(6);
    expect(grid.state.toHome).toBe(20);
  });
});
