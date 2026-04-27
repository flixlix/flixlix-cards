import { describe, expect, test } from "vitest";
import { computeNonFossilFromCollection } from "../src/states/utils/energy-period";
import { computeEnergyDistribution } from "../src/utils/compute-energy-distribution";
import { computeFlowRate } from "../src/utils/compute-flow-rate";
import { computePowerDistributionAfterSolarAndBattery } from "../src/utils/compute-power-distribution";
import { displayValue } from "../src/utils/display-value";

const thinSpace = `\u2009`;

describe("calculation regressions", () => {
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

  test("computePowerDistributionAfterSolarAndBattery handles battery-only export path", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 300, toGrid: 90, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: false,
      state: { total: 0, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: true,
      state: { fromBattery: 160, toBattery: 0, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: false, hasPercentage: false, state: { power: 0 } };

    computePowerDistributionAfterSolarAndBattery({
      entities: {
        grid: { display_zero_tolerance: 0 },
        battery: { display_zero_tolerance: 0 },
      },
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateWatts: () => 0,
      getEntityState: () => 0,
    });

    expect(battery.state.toGrid).toBe(90);
    expect(battery.state.toHome).toBe(70);
    expect(grid.state.toHome).toBe(300);
  });

  test("computePowerDistributionAfterSolarAndBattery zeros solar toBattery under solar tolerance", () => {
    const grid = {
      icon: "grid",
      powerOutage: { isOutage: false, icon: "outage" },
      state: { fromGrid: 100, toGrid: 0, toBattery: 0, toHome: 0 },
    };
    const solar = {
      has: true,
      state: { total: 50, toHome: 0, toBattery: 0, toGrid: 0 },
    };
    const battery = {
      has: true,
      state: { fromBattery: 0, toBattery: 10, toGrid: 0, toHome: 0 },
    };
    const nonFossil = { has: false, hasPercentage: false, state: { power: 0 } };

    computePowerDistributionAfterSolarAndBattery({
      entities: {
        grid: { display_zero_tolerance: 0 },
        battery: { display_zero_tolerance: 0 },
        solar: { display_zero_tolerance: 100 },
      },
      grid,
      solar,
      battery,
      nonFossil,
      getEntityStateWatts: () => 0,
      getEntityState: () => 0,
    });

    expect(solar.state.toBattery).toBe(0);
    expect(grid.state.toBattery).toBe(0);
  });

  test("computeFlowRate returns max_flow_rate for invalid new model range", () => {
    const config = {
      max_expected_power: 100,
      min_expected_power: 100,
      max_flow_rate: 10,
      min_flow_rate: 1,
      use_new_flow_rate_model: true,
    } as any;

    expect(computeFlowRate(config, 50, 0)).toBe(10);
  });

  test("displayValue supports mega units and explicit unit formatting", () => {
    const hass = { locale: "en" } as any;
    const config = {
      type: "energy-flow-card-plus",
      kilo_decimals: 1,
      base_decimals: 0,
      mega_decimals: 2,
      kilo_threshold: 1000,
      mega_threshold: 1000000,
    } as any;

    expect(displayValue(hass, config, 1500000, {})).toBe(`1.5${thinSpace}MWh`);
    expect(displayValue(hass, config, 1500, { unit: "Wh", unitWhiteSpace: false })).toBe("1,500Wh");
  });

  test("computeNonFossilFromCollection clamps to zero when fossil exceeds grid", () => {
    expect(computeNonFossilFromCollection({ coal: 2 }, 1000)).toEqual({
      nonFossilEnergy: 0,
      nonFossilPercentage: 0,
    });
  });
});
