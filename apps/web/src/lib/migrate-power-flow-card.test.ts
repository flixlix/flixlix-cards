import { parse } from "yaml";
import { describe, expect, it } from "vite-plus/test";

import { migratePowerFlowCard } from "./migrate-power-flow-card";

const migrated = (text: string) => {
  const migration = migratePowerFlowCard(text);
  if (migration.status !== "migrated") {
    throw new Error(`Expected a migrated config, got ${migration.status}`);
  }
  return { config: parse(migration.yaml) as unknown, leftOut: migration.leftOut };
};

describe("migratePowerFlowCard", () => {
  it("nests each sensor under entity and moves the battery charge onto the battery", () => {
    const { config, leftOut } = migrated(`type: custom:power-flow-card
entities:
  grid: sensor.grid_power
  solar: sensor.solar_power
  battery: sensor.battery_power
  battery_charge: sensor.battery_soc`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_power" },
        solar: { entity: "sensor.solar_power" },
        battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
      },
    });
    expect(leftOut).toEqual([]);
  });

  it.each([
    ["a comma-separated list", "inverted_entities: battery, grid"],
    ["a YAML list", "inverted_entities:\n  - battery\n  - grid"],
  ])("turns inverted_entities given as %s into invert_state on those nodes", (_form, option) => {
    const { config } = migrated(`type: custom:power-flow-card
entities:
  grid: sensor.grid_power
  solar: sensor.solar_power
  battery: sensor.battery_power
${option}`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid_power", invert_state: true },
        solar: { entity: "sensor.solar_power" },
        battery: { entity: "sensor.battery_power", invert_state: true },
      },
    });
  });

  it("keeps separate consumption and production sensors, which the original never inverts", () => {
    const { config } = migrated(`type: custom:power-flow-card
entities:
  grid:
    consumption: sensor.grid_in
    production: sensor.grid_out
  battery:
    consumption: sensor.battery_out
    production: sensor.battery_in
inverted_entities: grid, battery`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: { consumption: "sensor.grid_in", production: "sensor.grid_out" } },
        battery: { entity: { consumption: "sensor.battery_out", production: "sensor.battery_in" } },
      },
    });
  });

  it("renames the display options and keeps the ones both cards share", () => {
    const { config } = migrated(`type: custom:power-flow-card
title: Power
dashboard_link: /energy
w_decimals: 0
kw_decimals: 2
watt_threshold: 1500
min_flow_rate: 1
max_flow_rate: 5
entities:
  grid: sensor.grid_power`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      title: "Power",
      dashboard_link: "/energy",
      base_decimals: 0,
      kilo_decimals: 2,
      kilo_threshold: 1500,
      min_flow_rate: 1,
      max_flow_rate: 5,
      entities: { grid: { entity: "sensor.grid_power" } },
    });
  });

  it("leaves gas and water out and says so", () => {
    const { config, leftOut } = migrated(`type: custom:power-flow-card
entities:
  grid: sensor.grid_power
  gas: sensor.gas_flow
  water: sensor.water_flow`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid_power" } },
    });
    expect(leftOut.map((entry) => entry.option)).toEqual(["entities.gas", "entities.water"]);
  });

  it("leaves out a battery charge that has no battery to sit on", () => {
    const { config, leftOut } = migrated(`type: custom:power-flow-card
entities:
  solar: sensor.solar_power
  battery_charge: sensor.battery_soc`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: { solar: { entity: "sensor.solar_power" } },
    });
    expect(leftOut.map((entry) => entry.option)).toEqual(["entities.battery_charge"]);
  });

  it("migrates the card inside a stack and keeps the cards around it", () => {
    const { config } = migrated(`type: vertical-stack
cards:
  - type: markdown
    content: Power
  - type: custom:power-flow-card
    entities:
      grid: sensor.grid_power
    inverted_entities: grid`);

    expect(config).toEqual({
      type: "vertical-stack",
      cards: [
        { type: "markdown", content: "Power" },
        {
          type: "custom:power-flow-card-plus",
          entities: { grid: { entity: "sensor.grid_power", invert_state: true } },
        },
      ],
    });
  });

  it("migrates a card pasted without its type line", () => {
    const { config } = migrated(`entities:
  grid: sensor.grid_power`);

    expect(config).toEqual({
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid_power" } },
    });
  });

  it("reports a config that is already Power Flow Card Plus", () => {
    expect(
      migratePowerFlowCard(`type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power`)
    ).toEqual({ status: "no-card", alreadyPlus: true });
  });

  it("reports YAML without the original card", () => {
    expect(migratePowerFlowCard("type: markdown\ncontent: Power")).toEqual({
      status: "no-card",
      alreadyPlus: false,
    });
  });

  it("reports YAML that does not parse, with the parser's message", () => {
    const migration = migratePowerFlowCard("entities:\n  grid: [sensor.grid_power");

    expect(migration.status).toBe("invalid");
    expect(migration).toHaveProperty("message", expect.stringContaining("line 2"));
  });

  it("has nothing to say about an empty paste", () => {
    expect(migratePowerFlowCard("  \n")).toEqual({ status: "empty" });
  });
});
