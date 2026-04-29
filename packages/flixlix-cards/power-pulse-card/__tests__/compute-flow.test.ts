import { type HomeAssistant } from "custom-card-helpers";
import { describe, expect, test } from "vitest";
import { computePower } from "../src/utils/compute-flow";
import { type FlixlixPowerCardConfig } from "../src/types";

type StateMap = Record<string, { state: string; unit?: string }>;

function makeHass(states: StateMap): HomeAssistant {
  const hassStates: HomeAssistant["states"] = {};
  for (const [id, s] of Object.entries(states)) {
    hassStates[id] = {
      entity_id: id,
      state: s.state,
      attributes: { unit_of_measurement: s.unit ?? "W" },
      last_changed: "",
      last_updated: "",
      context: { id: "", parent_id: null, user_id: null },
    };
  }
  return { states: hassStates } as unknown as HomeAssistant;
}

function cfg(entities: FlixlixPowerCardConfig["entities"]): FlixlixPowerCardConfig {
  return { type: "custom:power-pulse-card", entities };
}

describe("computePower — grid only", () => {
  test("positive single-entity grid reads as consumption, no export", () => {
    const hass = makeHass({ "sensor.grid": { state: "500" } });
    const r = computePower(hass, cfg({ grid: { entity: "sensor.grid" } }));
    expect(r.grid.total).toBe(500);
    expect(r.grid.exporting).toBe(0);
    expect(r.grid.toHome).toBe(500);
    expect(r.grid.producing).toBe(true);
    expect(r.home.totalConsumption).toBe(500);
  });

  test("negative single-entity grid reads as production, zero consumption", () => {
    const hass = makeHass({ "sensor.grid": { state: "-300" } });
    const r = computePower(hass, cfg({ grid: { entity: "sensor.grid" } }));
    expect(r.grid.total).toBe(0);
    expect(r.grid.exporting).toBe(300);
    expect(r.grid.toHome).toBe(0);
    expect(r.home.totalConsumption).toBe(0);
  });

  test("split entities are read independently", () => {
    const hass = makeHass({
      "sensor.import": { state: "200" },
      "sensor.export": { state: "150" },
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: { consumption: "sensor.import", production: "sensor.export" } },
      })
    );
    expect(r.grid.total).toBe(200);
    expect(r.grid.exporting).toBe(150);
  });
});

describe("computePower — solar arrays", () => {
  test("multiple solars sum and each gets allocated by its share", () => {
    const hass = makeHass({
      "sensor.solar_east": { state: "1000" },
      "sensor.solar_west": { state: "500" },
    });
    const r = computePower(
      hass,
      cfg({
        solars: [{ entity: "sensor.solar_east" }, { entity: "sensor.solar_west" }],
      })
    );
    expect(r.solars).toHaveLength(2);
    expect(r.solars[0]!.total).toBe(1000);
    expect(r.solars[1]!.total).toBe(500);
    // No grid → all 1500 W goes to home, split 1000:500.
    expect(r.home.totalConsumption).toBe(1500);
    expect(r.solars[0]!.toHome).toBe(1000);
    expect(r.solars[1]!.toHome).toBe(500);
  });

  test("negative solar reading is clamped to zero", () => {
    const hass = makeHass({ "sensor.solar": { state: "-50" } });
    const r = computePower(hass, cfg({ solars: [{ entity: "sensor.solar" }] }));
    expect(r.solars[0]!.total).toBe(0);
    expect(r.solars[0]!.producing).toBe(false);
  });
});

describe("computePower — battery", () => {
  test("positive single-entity battery reads as discharging", () => {
    const hass = makeHass({ "sensor.bat": { state: "400" } });
    const r = computePower(hass, cfg({ batteries: [{ entity: "sensor.bat" }] }));
    expect(r.batteries[0]!.total).toBe(400);
    expect(r.batteries[0]!.toBattery).toBe(0);
    expect(r.batteries[0]!.charging).toBe(false);
    expect(r.batteries[0]!.producing).toBe(true);
    expect(r.home.totalConsumption).toBe(400);
  });

  test("negative single-entity battery reads as charging", () => {
    const hass = makeHass({ "sensor.bat": { state: "-200" } });
    const r = computePower(hass, cfg({ batteries: [{ entity: "sensor.bat" }] }));
    expect(r.batteries[0]!.total).toBe(0);
    expect(r.batteries[0]!.toBattery).toBe(200);
    expect(r.batteries[0]!.charging).toBe(true);
  });

  test("split battery entity reads consumption=discharging, production=charging", () => {
    const hass = makeHass({
      "sensor.bat_out": { state: "300" },
      "sensor.bat_in": { state: "100" },
    });
    const r = computePower(
      hass,
      cfg({
        batteries: [
          { entity: { consumption: "sensor.bat_out", production: "sensor.bat_in" } },
        ],
      })
    );
    expect(r.batteries[0]!.total).toBe(300);
    expect(r.batteries[0]!.toBattery).toBe(100);
    // `charging` requires zero discharge; with both flows present it's mixed,
    // so the bubble shouldn't flip to "charging".
    expect(r.batteries[0]!.charging).toBe(false);
  });

  test("multiple batteries: one charging, one discharging", () => {
    const hass = makeHass({
      "sensor.bat1": { state: "500" },
      "sensor.bat2": { state: "-150" },
    });
    const r = computePower(
      hass,
      cfg({ batteries: [{ entity: "sensor.bat1" }, { entity: "sensor.bat2" }] })
    );
    expect(r.batteries[0]!.charging).toBe(false);
    expect(r.batteries[0]!.total).toBe(500);
    expect(r.batteries[1]!.charging).toBe(true);
    expect(r.batteries[1]!.toBattery).toBe(150);
  });
});

describe("computePower — home consumption math", () => {
  test("home = sources in − grid export − battery charging", () => {
    const hass = makeHass({
      "sensor.grid": { state: "200" },
      "sensor.solar": { state: "1500" },
      "sensor.bat": { state: "-300" }, // charging
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: "sensor.grid" },
        solars: [{ entity: "sensor.solar" }],
        batteries: [{ entity: "sensor.bat" }],
      })
    );
    // sources_in = 200 (grid) + 1500 (solar) + 0 (bat discharge) = 1700
    // out = 0 (no export) + 300 (charging)
    // home = 1700 − 0 − 300 = 1400
    expect(r.home.totalConsumption).toBe(1400);
  });

  test("solar overproduction routed to grid does not flow to home", () => {
    const hass = makeHass({
      "sensor.grid_in": { state: "0" },
      "sensor.grid_out": { state: "800" },
      "sensor.solar": { state: "2000" },
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" } },
        solars: [{ entity: "sensor.solar" }],
      })
    );
    // sources_in = 2000, export = 800 → home = 1200.
    expect(r.home.totalConsumption).toBe(1200);
    expect(r.solars[0]!.toHome).toBe(1200);
    expect(r.grid.exporting).toBe(800);
  });

  test("home is clamped to zero when outputs exceed inputs", () => {
    const hass = makeHass({
      "sensor.grid": { state: "0" },
      "sensor.solar": { state: "100" },
      "sensor.bat": { state: "-500" }, // charging more than solar can supply
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: "sensor.grid" },
        solars: [{ entity: "sensor.solar" }],
        batteries: [{ entity: "sensor.bat" }],
      })
    );
    expect(r.home.totalConsumption).toBe(0);
  });
});

describe("computePower — share allocation", () => {
  test("multiple sources share home consumption proportionally", () => {
    const hass = makeHass({
      "sensor.grid": { state: "300" },
      "sensor.solar": { state: "700" },
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: "sensor.grid" },
        solars: [{ entity: "sensor.solar" }],
      })
    );
    // total in = 1000, home = 1000. grid:home = 300, solar:home = 700.
    expect(r.grid.toHome).toBe(300);
    expect(r.solars[0]!.toHome).toBe(700);
  });

  test("allocation ratio stays correct when home < total in (export present)", () => {
    const hass = makeHass({
      "sensor.grid_in": { state: "0" },
      "sensor.grid_out": { state: "400" },
      "sensor.solar": { state: "1000" },
      "sensor.bat": { state: "1000" }, // discharging
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" } },
        solars: [{ entity: "sensor.solar" }],
        batteries: [{ entity: "sensor.bat" }],
      })
    );
    // sources_in = 2000, export = 400, home = 1600.
    // each source gets share/2000 * 1600 = share * 0.8
    expect(r.solars[0]!.toHome).toBeCloseTo(800);
    expect(r.batteries[0]!.toHome).toBeCloseTo(800);
    expect(r.grid.toHome).toBe(0);
  });

  test("zero total source produces no division-by-zero, all toHome are 0", () => {
    const hass = makeHass({
      "sensor.grid": { state: "0" },
      "sensor.solar": { state: "0" },
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: "sensor.grid" },
        solars: [{ entity: "sensor.solar" }],
      })
    );
    expect(r.grid.toHome).toBe(0);
    expect(r.solars[0]!.toHome).toBe(0);
    expect(r.home.totalConsumption).toBe(0);
  });
});

describe("computePower — devices", () => {
  test("device powers are read directly and clamped to non-negative", () => {
    const hass = makeHass({
      "sensor.grid": { state: "100" },
      "sensor.kitchen": { state: "200" },
      "sensor.bad": { state: "-50" },
    });
    const r = computePower(
      hass,
      cfg({
        grid: { entity: "sensor.grid" },
        devices: [{ entity: "sensor.kitchen" }, { entity: "sensor.bad" }],
      })
    );
    expect(r.devices[0]!.power).toBe(200);
    expect(r.devices[1]!.power).toBe(0);
  });
});

describe("computePower — unit prefixes", () => {
  test("kW unit is converted to watts", () => {
    const hass = makeHass({ "sensor.solar": { state: "2.5", unit: "kW" } });
    const r = computePower(hass, cfg({ solars: [{ entity: "sensor.solar" }] }));
    expect(r.solars[0]!.total).toBe(2500);
  });

  test("MW unit is converted to watts", () => {
    const hass = makeHass({ "sensor.solar": { state: "1.2", unit: "MW" } });
    const r = computePower(hass, cfg({ solars: [{ entity: "sensor.solar" }] }));
    expect(r.solars[0]!.total).toBe(1_200_000);
  });
});
