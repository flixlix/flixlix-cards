import { type HouseNode } from "@flixlix-cards/shared/card-state";
import { CAR_LABEL_AT } from "./car-shape";
import { type Point, project } from "./geometry";
import {
  FRONT,
  GENERATOR,
  GENERATOR_X,
  GENERATOR_Y,
  GRID_LABEL_X,
  HEAT_PUMP,
  HEAT_PUMP_FRONT,
  heatPumpBottom,
  heatPumpLeft,
  INVERTER_Y,
  onBattery,
  onRoof,
  PANELS,
  type SceneLayout,
} from "./scene";

/**
 * Where each node's label hangs: the leader line starts at `at` and runs `leader` screen units up
 * (negative) or down, with the label's text running right from it. The anchors keep leaders and
 * labels clear of the wires, the panels and each other.
 */
export type LabelledNode = HouseNode;

/** `side: "left"`: the label hangs left of its leader, its text still starting on the left. */
export type LabelAnchor = { at: Point; leader: number; side?: "left" };

export const LABEL_ANCHORS: Record<Exclude<LabelledNode, "heat_pump">, LabelAnchor> = {
  solar: { at: onRoof(4.2, PANELS.y0), leader: -40 },
  home: { at: [8.1, FRONT + 0.13, 2.35], leader: 44 },
  battery: { at: onBattery(1.8, 3.3), leader: -50 },
  // on the cable before it fades, its label where the generator's goes: live, the two never show together
  grid: { at: [GRID_LABEL_X, INVERTER_Y, 0], leader: -32 },
  // above the generator, right of the battery and below its label
  generator: { at: [GENERATOR_X, GENERATOR_Y, GENERATOR.height], leader: -22 },
  // down from the car's tail, left of the home's label
  car: { at: CAR_LABEL_AT, leader: 24 },
};

/**
 * The heat pump's label hangs left of its leader, into the room left of the house. With a car it
 * rises from the unit's top right corner to above the roof's eave, so it reaches less far left;
 * without one, a label up there would cover the panels, so it hangs down from the unit's foot into
 * the ground the car would take, left of the home's label.
 */
const heatPumpAnchor = (layout: SceneLayout): LabelAnchor => {
  const x = heatPumpLeft(layout);
  const bottom = heatPumpBottom(layout);
  if (!layout.car) {
    return { at: [x, HEAT_PUMP_FRONT, bottom], leader: 26, side: "left" };
  }
  const at: Point = [x + HEAT_PUMP.width - 0.3, HEAT_PUMP_FRONT, bottom + HEAT_PUMP.height];
  // its leader ends left of the roof's slope, clear of the roof and the solar label
  return { at, leader: -58 - project(at)[1], side: "left" };
};

/** Under the grid cable, clear of the generator's label above it. */
const GRID_UNDER_CABLE: LabelAnchor = { at: LABEL_ANCHORS.grid.at, leader: 24, side: "left" };

export const labelAnchor = (node: LabelledNode, layout: SceneLayout): LabelAnchor => {
  if (node === "heat_pump") {
    return heatPumpAnchor(layout);
  }
  return node === "grid" && layout.generatorBesideGrid ? GRID_UNDER_CABLE : LABEL_ANCHORS[node];
};
