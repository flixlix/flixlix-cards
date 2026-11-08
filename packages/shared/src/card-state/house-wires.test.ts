import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { describe, expect, test } from "vite-plus/test";
import { computeCardState } from "./compute-card-state";
import { houseWires } from "./house-wires";
import { type ReadyReadings } from "./types";

const partialHass: Partial<HomeAssistant> = {
  localize: (key: string) => key,
  locale: {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
  },
  states: {},
};
const hass = partialHass as HomeAssistant;

const config = (entities: FlowCardPlusConfig["entities"]): FlowCardPlusConfig => ({
  type: "custom:power-flow-house-card",
  min_flow_rate: 0.75,
  max_flow_rate: 6,
  max_expected_power: 2000,
  min_expected_power: 0.01,
  clickable_entities: false,
  base_decimals: 0,
  kilo_decimals: 1,
  kilo_threshold: 1000,
  mega_decimals: 1,
  mega_threshold: 1_000_000,
  entities,
});

const allNodes = config({
  grid: { entity: "sensor.grid" },
  solar: { entity: "sensor.solar" },
  battery: { entity: "sensor.battery" },
});

type Power = {
  solar?: number;
  fromBattery?: number;
  toBattery?: number;
  fromGrid?: number;
  toGrid?: number;
};

const readings = (power: Power): ReadyReadings => ({
  status: "ready",
  family: "power",
  grid: { kind: "split", outOf: power.fromGrid ?? 0, into: power.toGrid ?? 0 },
  solar: { total: power.solar ?? 0, secondary: 0 },
  battery: { kind: "split", outOf: power.fromBattery ?? 0, into: power.toBattery ?? 0 },
  home: null,
  generator: null,
  individuals: [],
});

const wiresFor = (cardConfig: FlowCardPlusConfig, power: Power) => {
  const state = computeCardState({
    config: cardConfig,
    hass,
    readings: readings(power),
    templates: {
      gridSecondary: undefined,
      solarSecondary: undefined,
      homeSecondary: undefined,
      nonFossilFuelSecondary: undefined,
      individual: [],
    },
    width: 400,
  });
  if (state.status !== "ready") {
    throw new Error("expected a ready card state");
  }
  return houseWires(cardConfig, state);
};

const summary = (cardConfig: FlowCardPlusConfig, power: Power) =>
  wiresFor(cardConfig, power).map(({ node, power: watts, intoInverter, color }) => ({
    node,
    watts,
    intoInverter,
    color,
  }));

describe("house wires", () => {
  test("an evening on the battery: production and discharge run into the inverter, home out of it", () => {
    expect(summary(allNodes, { solar: 800, fromBattery: 1800 })).toEqual([
      { node: "solar", watts: 800, intoInverter: true, color: "var(--energy-solar-color)" },
      {
        node: "battery",
        watts: 1800,
        intoInverter: true,
        color: "var(--energy-battery-out-color)",
      },
      { node: "grid", watts: 0, intoInverter: true, color: "var(--energy-grid-consumption-color)" },
      { node: "home", watts: 2600, intoInverter: false, color: "var(--energy-battery-out-color)" },
    ]);
  });

  test("a sunny noon: charging and export run out of the inverter, home takes the solar colour", () => {
    expect(summary(allNodes, { solar: 6200, toBattery: 2500, toGrid: 2300 })).toEqual([
      { node: "solar", watts: 6200, intoInverter: true, color: "var(--energy-solar-color)" },
      {
        node: "battery",
        watts: 2500,
        intoInverter: false,
        color: "var(--energy-battery-in-color)",
      },
      { node: "grid", watts: 2300, intoInverter: false, color: "var(--energy-grid-return-color)" },
      { node: "home", watts: 1400, intoInverter: false, color: "var(--energy-solar-color)" },
    ]);
  });

  test("a node that is not configured has no wire", () => {
    const gridOnly = config({ grid: { entity: "sensor.grid" } });
    expect(wiresFor(gridOnly, { fromGrid: 500 }).map((wire) => wire.node)).toEqual([
      "grid",
      "home",
    ]);
  });

  test("a wire carries its node's net power when both directions read at once", () => {
    const [, battery] = wiresFor(allNodes, { solar: 1000, fromBattery: 300, toBattery: 1000 });
    expect(battery).toMatchObject({ node: "battery", power: 700, intoInverter: false });
  });

  test("readings are scaled and rounded like the card's other values", () => {
    const [solar, , , home] = wiresFor(allNodes, { solar: 800, fromBattery: 1840 });
    expect(solar?.reading).toEqual({ value: 800, unit: "W", decimals: 0 });
    expect(home?.reading).toEqual({ value: 2.6, unit: "kW", decimals: 1 });
  });

  test("a node's own unit and decimals apply to its reading", () => {
    const kilo = config({
      solar: { entity: "sensor.solar", unit_of_measurement: "kW", decimals: 2 },
    });
    const [solar] = wiresFor(kilo, { solar: 1234 });
    expect(solar?.reading).toEqual({ value: 1.23, unit: "kW", decimals: 2 });
  });

  test("more power pulses faster", () => {
    const [solar, battery] = wiresFor(allNodes, { solar: 300, toBattery: 0, fromBattery: 1500 });
    expect(battery?.durationSeconds).toBeLessThan(solar?.durationSeconds ?? 0);
  });
});
