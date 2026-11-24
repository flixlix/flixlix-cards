import { type HouseNode } from "@flixlix-cards/shared/card-state";
import {
  FRONT,
  GAS_METER,
  GAS_METER_Y,
  GENERATOR_X,
  GENERATOR_Y,
  HEAT_PUMP,
  heatPumpBottom,
  heatPumpRight,
  INVERTER,
  INVERTER_Y,
  INVERTER_Z,
  LENGTH,
  onRoof,
  OUTLET,
  PANELS,
  type Point,
  type SceneGroup,
  type SceneLayout,
} from "./scene";

/** Where the grid's label points at its cable: out past the generator, under its label's place. */
export const GRID_LABEL_X = 19.5;

/** The grid cable runs on past the card's edge, fading out from GRID_FADE_FROM onwards. */
const GRID_CABLE_END = 40;
export const GRID_FADE_FROM: Point = [GRID_LABEL_X + 1.5, 5.05, 0];
export const GRID_CABLE_START: Point = [LENGTH + 0.07, INVERTER_Y, 0.02];
const ON_FRONT = FRONT + 0.07;
const ON_GABLE = LENGTH + 0.07;

/** Where the gas pipe's label points at it, nearer the house than the grid's. */
export const GAS_LABEL_X = 15;
/** The gas pipe runs from the street in front of the grid cable, fading out as it does. */
export const GAS_PIPE_START: Point = [ON_GABLE, GAS_METER_Y, 0.02];
export const GAS_FADE_FROM: Point = [GAS_LABEL_X + 2.5, GAS_METER_Y, 0];
/**
 * Where the car's wire rises up the front wall, behind the car's nose and just left of the outlet,
 * so the wall left of it stays free for the heat pump.
 */
const CAR_WIRE_X = 7.15;
/** The car's wire meets the outlet's left side low, the heat pump's above it. */
const CAR_WIRE_Z = 2.6;
const HEAT_PUMP_WIRE_Z = 3.1;
/** The generator's wire runs parallel to the grid cable, just behind it. */
const GENERATOR_WIRE_Y = INVERTER.y0 + 0.1;

/**
 * Each wire's route from its node to the inverter, along walls and ground. They meet the inverter
 * from four sides: solar from above, the battery from the back, home round the front corner and
 * the grid from below. A wire ends on the surface of a fixture it lies in front of and runs into
 * one it passes behind; `DRAW_ORDER` stacks them to match.
 */
export const WIRE_ROUTES: Record<Exclude<HouseNode, "heat_pump">, Point[]> = {
  // in from the street along the ground, then up the gable into the meter's underside
  gas: [[GRID_CABLE_END, GAS_METER_Y, 0.02], GAS_PIPE_START, [ON_GABLE, GAS_METER_Y, GAS_METER.z0]],
  // from the panels along the roof, parallel to its ridge, then down the gable: one bend
  solar: [
    onRoof(PANELS.x1 - 0.4, INVERTER_Y),
    onRoof(ON_GABLE, INVERTER_Y),
    [ON_GABLE, INVERTER_Y, INVERTER.z1],
  ],
  battery: [
    [ON_GABLE, 2.6, INVERTER_Z],
    [ON_GABLE, INVERTER_Y, INVERTER_Z],
  ],
  home: [
    [OUTLET.x1, ON_FRONT, INVERTER_Z],
    [LENGTH - 0.03, ON_FRONT, INVERTER_Z],
    [ON_GABLE, FRONT - 0.03, INVERTER_Z],
    [ON_GABLE, INVERTER.y1, INVERTER_Z],
  ],
  grid: [[GRID_CABLE_END, INVERTER_Y, 0.02], GRID_CABLE_START, [ON_GABLE, INVERTER_Y, INVERTER_Z]],
  // from under the generator, along the ground beside the grid cable and up into the inverter:
  // two separate wires, never joined outside the inverter
  generator: [
    [GENERATOR_X, GENERATOR_Y, 0.02],
    [GENERATOR_X, GENERATOR_WIRE_Y, 0.02],
    [ON_GABLE, GENERATOR_WIRE_Y, 0.02],
    [ON_GABLE, GENERATOR_WIRE_Y, INVERTER_Z],
  ],
  // the car hangs off the home's outlet: up the front wall from behind the car's nose
  car: [
    [CAR_WIRE_X, ON_FRONT, 0.02],
    [CAR_WIRE_X, ON_FRONT, CAR_WIRE_Z],
    [OUTLET.x0, ON_FRONT, CAR_WIRE_Z],
  ],
};

/**
 * The heat pump also hangs off the outlet: level along the wall above the car's wire, or without
 * a car low along the wall and up the car's route, which is free then.
 */
const heatPumpRoute = (layout: SceneLayout): Point[] => {
  if (layout.car) {
    return [
      [heatPumpRight(layout), ON_FRONT, HEAT_PUMP_WIRE_Z],
      [OUTLET.x0, ON_FRONT, HEAT_PUMP_WIRE_Z],
    ];
  }
  const middle = heatPumpBottom(layout) + HEAT_PUMP.height / 2;
  return [
    [heatPumpRight(layout), ON_FRONT, middle],
    [CAR_WIRE_X, ON_FRONT, middle],
    [CAR_WIRE_X, ON_FRONT, CAR_WIRE_Z],
    [OUTLET.x0, ON_FRONT, CAR_WIRE_Z],
  ];
};

/**
 * A node's wire from the node to the inverter, to the outlet for the car and the heat pump, or
 * from the street to its meter for gas.
 */
export const wireRoute = (node: HouseNode, layout: SceneLayout): Point[] =>
  node === "heat_pump" ? heatPumpRoute(layout) : WIRE_ROUTES[node];

/**
 * Wires and fixtures from back to front, over the walls and roof. Each wire sits over the fixtures
 * it lies in front of and under those it runs into, as in 3D.
 */
export const DRAW_ORDER: readonly ({ wire: HouseNode } | { part: SceneGroup["node"] })[] = [
  { wire: "grid" }, // up into the inverter from below
  { wire: "gas" }, // in front of the grid cable, up into the meter's underside
  { part: "gas" },
  { wire: "generator" }, // beside the grid cable, out from under the generator
  { part: "generator" },
  { part: "battery" },
  { wire: "battery" }, // from the battery's visible side into the inverter's back
  { part: "inverter" },
  { wire: "heat_pump" }, // out of the heat pump's side into the outlet's
  { part: "heat_pump" },
  { wire: "car" }, // into the outlet's side, from behind the car
  { part: "outlet" },
  { wire: "home" }, // onto the inverter's and the outlet's visible sides
  { wire: "solar" }, // onto the inverter's top, from under the panels
  { part: "solar" },
];
