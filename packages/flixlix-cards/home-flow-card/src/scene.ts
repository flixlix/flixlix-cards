import { type HouseNode } from "@flixlix-cards/shared/card-state";
import { type ChargeLevel } from "@flixlix-cards/shared/utils/severity";
import { mdiFan, mdiFlash, mdiGeneratorStationary, mdiHome } from "@mdi/js";
import { box, face, type Face, type Point, type Shape } from "./geometry";

export {
  type Face,
  faceTransform,
  type Point,
  project,
  roundedPath,
  type ScreenPoint,
  type Shape,
} from "./geometry";

/** A part of the house, one group per node so each can be clicked on its own. */
export type SceneGroup = { node: HouseNode | "inverter" | "outlet"; shapes: Shape[] };

/** Height of the gable roof above (x, y): ridge along x at y = 4. */
export const roofHeight = (y: number): number => 8.6 - Math.abs(y - 4) * 0.85;

/** The house is 11 long, 8 deep and 5.2 to the eaves; the front wall faces y = 8. */
export const FRONT = 8;
const LENGTH = 11;
const EAVES = 5.2;
const EAVE_Y = 8.6;
const BACK_EAVE_Y = -0.6;
const OVERHANG_X = 11.4;
const FASCIA = 0.28;

const house = (): Shape[] => [
  face(
    "gable",
    [LENGTH, 0, 0],
    [LENGTH, FRONT, 0],
    [LENGTH, FRONT, EAVES],
    [LENGTH, 4, 8.6],
    [LENGTH, 0, EAVES]
  ),
  face("wall", [0, FRONT, 0], [LENGTH, FRONT, 0], [LENGTH, FRONT, EAVES], [0, FRONT, EAVES]),
  face(
    "roof-back",
    [0, BACK_EAVE_Y, roofHeight(BACK_EAVE_Y)],
    [OVERHANG_X, BACK_EAVE_Y, roofHeight(BACK_EAVE_Y)],
    [OVERHANG_X, 4, 8.6],
    [0, 4, 8.6]
  ),
  face(
    "roof",
    [0, 4, 8.6],
    [OVERHANG_X, 4, 8.6],
    [OVERHANG_X, EAVE_Y, roofHeight(EAVE_Y)],
    [0, EAVE_Y, roofHeight(EAVE_Y)]
  ),
  face(
    "fascia",
    [0, EAVE_Y, roofHeight(EAVE_Y)],
    [OVERHANG_X, EAVE_Y, roofHeight(EAVE_Y)],
    [OVERHANG_X, EAVE_Y, roofHeight(EAVE_Y) - FASCIA],
    [0, EAVE_Y, roofHeight(EAVE_Y) - FASCIA]
  ),
  face(
    "fascia",
    [OVERHANG_X, BACK_EAVE_Y, roofHeight(BACK_EAVE_Y)],
    [OVERHANG_X, 4, 8.6],
    [OVERHANG_X, EAVE_Y, roofHeight(EAVE_Y)],
    [OVERHANG_X, EAVE_Y, roofHeight(EAVE_Y) - FASCIA],
    [OVERHANG_X, 4, 8.6 - FASCIA],
    [OVERHANG_X, BACK_EAVE_Y, roofHeight(BACK_EAVE_Y) - FASCIA]
  ),
];

const OUTLET = { x0: 7.6, x1: 8.6 } as const;
const OUTLET_X = (OUTLET.x0 + OUTLET.x1) / 2;

/** The plate on the front wall where the home wire ends. */
const outlet = (): Shape[] => [
  ...box([OUTLET.x0, FRONT, 2.35], [OUTLET.x1 - OUTLET.x0, 0.12, 1]),
  { kind: "icon", face: "front", at: [OUTLET_X, FRONT + 0.13, 2.85], size: 0.55, path: mdiHome },
];

/** The panel array: 6 columns along the ridge, 2 rows down the front roof. */
export const PANELS = { x0: 1, x1: 9.8, y0: 4.4, y1: 8.25, columns: 6, rows: 2 } as const;
export const onRoof = (x: number, y: number): Point => [x, y, roofHeight(y) + 0.05];

const panels = (): Shape[] => {
  const { x0, x1, y0, y1 } = PANELS;
  return [face("panel", onRoof(x0, y0), onRoof(x1, y0), onRoof(x1, y1), onRoof(x0, y1))];
};

/** The lines between panels, as point pairs. */
export const panelSeams = (): [Point, Point][] => {
  const { x0, x1, y0, y1, columns, rows } = PANELS;
  const columnSeams = Array.from({ length: columns - 1 }, (_, i): [Point, Point] => {
    const x = x0 + ((x1 - x0) * (i + 1)) / columns;
    return [onRoof(x, y0), onRoof(x, y1)];
  });
  const rowSeams = Array.from({ length: rows - 1 }, (_, i): [Point, Point] => {
    const y = y0 + ((y1 - y0) * (i + 1)) / rows;
    return [onRoof(x0, y), onRoof(x1, y)];
  });
  return [...columnSeams, ...rowSeams];
};

/** The battery and the inverter hang on the gable wall; their faces look along x. */
const BATTERY_FACE_X = LENGTH + 0.46;
const SOC_STRIP = { y0: 2.25, y1: 2.47, z0: 0.8, z1: 3 } as const;

export const onBattery = (y: number, z: number, offset = 0): Point => [
  BATTERY_FACE_X + offset,
  y,
  z,
];

/** How the battery looks: its icon's path and its charge bar. */
export type BatteryLook = {
  icon: string;
  /** In [0, 1], or null without a state of charge entity. */
  soc: number | null;
  /** The bar's colour; without one it takes the card's own charge colour. */
  level?: ChargeLevel;
};

const battery = ({ icon, soc, level }: BatteryLook): Shape[] => [
  ...box([LENGTH, 1, 0.5], [0.45, 1.6, 2.8]),
  { kind: "icon", face: "gable", at: onBattery(1.65, 2), size: 0.9, path: icon },
  face(
    "soc-track",
    onBattery(SOC_STRIP.y0, SOC_STRIP.z0),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z0),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z1),
    onBattery(SOC_STRIP.y0, SOC_STRIP.z1)
  ),
  ...(soc === null
    ? []
    : [
        socFill(
          SOC_STRIP.z0 + (SOC_STRIP.z1 - SOC_STRIP.z0) * Math.min(Math.max(soc, 0), 1),
          level
        ),
      ]),
];

const socFill = (top: number, level: ChargeLevel | undefined): Face =>
  face(
    level ? `soc-${level}` : "soc",
    onBattery(SOC_STRIP.y0, SOC_STRIP.z0, 0.01),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z0, 0.01),
    onBattery(SOC_STRIP.y1, top, 0.01),
    onBattery(SOC_STRIP.y0, top, 0.01)
  );

/** Where every wire meets, on the gable wall. */
export const INVERTER = { y0: 4.5, y1: 5.6, z0: 2.3, z1: 3.4 } as const;
export const INVERTER_Y = (INVERTER.y0 + INVERTER.y1) / 2;
const INVERTER_Z = (INVERTER.z0 + INVERTER.z1) / 2;

const inverter = (): Shape[] => [
  ...box(
    [LENGTH, INVERTER.y0, INVERTER.z0],
    [0.3, INVERTER.y1 - INVERTER.y0, INVERTER.z1 - INVERTER.z0]
  ),
  {
    kind: "icon",
    face: "gable",
    at: [LENGTH + 0.31, INVERTER_Y, INVERTER_Z],
    size: 0.6,
    path: mdiFlash,
  },
];

/** A generator on the ground well off the gable, behind the grid cable and clear of it. */
export const GENERATOR = { x0: 16, x1: 17.8, y0: 1.9, y1: 3.1, height: 1.3 } as const;
export const GENERATOR_X = (GENERATOR.x0 + GENERATOR.x1) / 2;
export const GENERATOR_Y = (GENERATOR.y0 + GENERATOR.y1) / 2;

const generator = (): Shape[] => [
  ...box(
    [GENERATOR.x0, GENERATOR.y0, 0],
    [GENERATOR.x1 - GENERATOR.x0, GENERATOR.y1 - GENERATOR.y0, GENERATOR.height]
  ),
  {
    kind: "icon",
    face: "front",
    at: [GENERATOR_X, GENERATOR.y1 + 0.01, GENERATOR.height / 2],
    size: 0.8,
    path: mdiGeneratorStationary,
  },
];

/**
 * What else is configured that moves things on the house. Only the config decides, never whether
 * the car is home, so nothing moves as the car comes and goes.
 */
export type SceneLayout = {
  car: boolean;
  /**
   * An energy card's generator runs beside the grid rather than in its place, so their labels
   * show together and the grid's hangs under its cable instead.
   */
  generatorBesideGrid?: boolean;
};

/**
 * The heat pump hangs on the front wall. With a car configured it sits at the wall's far left,
 * just above the car's roof; without one it comes down near the ground, further along the wall,
 * where the car would park.
 */
export const HEAT_PUMP = { width: 2.2, depth: 0.65, height: 1.4 } as const;
export const heatPumpLeft = ({ car }: SceneLayout) => (car ? 0.3 : 2.4);
export const heatPumpBottom = ({ car }: SceneLayout) => (car ? 1.95 : 0.35);
const heatPumpRight = (layout: SceneLayout) => heatPumpLeft(layout) + HEAT_PUMP.width;
export const HEAT_PUMP_FRONT = FRONT + HEAT_PUMP.depth;

const heatPump = (layout: SceneLayout, running: boolean): Shape[] => {
  const [x0, z0] = [heatPumpLeft(layout), heatPumpBottom(layout)];
  const { width, height } = HEAT_PUMP;
  const middle: Point = [x0 + width / 2, HEAT_PUMP_FRONT + 0.01, z0 + height / 2];
  const radius = 0.52;
  const grille = Array.from({ length: 28 }, (_, i): Point => {
    const turn = (i / 28) * Math.PI * 2;
    return [middle[0] + Math.cos(turn) * radius, middle[1], middle[2] + Math.sin(turn) * radius];
  });
  return [
    ...box([x0, FRONT, z0], [HEAT_PUMP.width, HEAT_PUMP.depth, HEAT_PUMP.height]),
    face("grille", ...grille),
    { kind: "icon", face: "front", at: middle, size: radius * 1.7, path: mdiFan, spin: running },
  ];
};

/** What the house shows: panels with solar, and each fixture that is configured. */
export type ScenePresence = {
  solar: boolean;
  battery?: BatteryLook;
  generator?: boolean;
  heatPump?: { layout: SceneLayout; running: boolean };
};

/** Walls and roof: drawn before the wires, which run on them. */
export const houseShell = (): SceneGroup => ({ node: "home", shapes: house() });

/**
 * What the wires connect, drawn over the wires: each wire runs into its fixture, so the fixture
 * hides the wire's end the way it would in 3D.
 */
export const fixtures = ({
  solar,
  battery: look,
  generator: hasGenerator,
  heatPump: pump,
}: ScenePresence): SceneGroup[] => [
  ...(solar ? [{ node: "solar" as const, shapes: panels() }] : []),
  ...(look ? [{ node: "battery" as const, shapes: battery(look) }] : []),
  ...(hasGenerator ? [{ node: "generator" as const, shapes: generator() }] : []),
  ...(pump ? [{ node: "heat_pump" as const, shapes: heatPump(pump.layout, pump.running) }] : []),
  { node: "outlet", shapes: outlet() },
  { node: "inverter", shapes: inverter() },
];

/** Where the grid's label points at its cable: out past the generator, under its label's place. */
export const GRID_LABEL_X = 19.5;

/** The grid cable runs on past the card's edge, fading out from GRID_FADE_FROM onwards. */
const GRID_CABLE_END = 40;
export const GRID_FADE_FROM: Point = [GRID_LABEL_X + 1.5, 5.05, 0];
export const GRID_CABLE_START: Point = [LENGTH + 0.07, INVERTER_Y, 0.02];
const ON_FRONT = FRONT + 0.07;
const ON_GABLE = LENGTH + 0.07;
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

/** A node's wire from the node to the inverter, or to the outlet for the car and the heat pump. */
export const wireRoute = (node: HouseNode, layout: SceneLayout): Point[] =>
  node === "heat_pump" ? heatPumpRoute(layout) : WIRE_ROUTES[node];

/**
 * Wires and fixtures from back to front, over the walls and roof. Each wire sits over the fixtures
 * it lies in front of and under those it runs into, as in 3D.
 */
export const DRAW_ORDER: readonly ({ wire: HouseNode } | { part: SceneGroup["node"] })[] = [
  { wire: "grid" }, // up into the inverter from below
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

/** The house's leftmost and rightmost points: its front eave and its gable's back corner. */
export const HOUSE_SPAN: readonly [Point, Point] = [
  [0, EAVE_Y, 0],
  [OVERHANG_X, BACK_EAVE_Y, 0],
];

/** The house's footprint and the shadow it casts towards the back right. */
export const SHADOW: Point[] = [
  [0, 0, 0],
  [LENGTH, 0, 0],
  [17, 3, 0],
  [17, 11, 0],
  [LENGTH, 8.5, 0],
  [0, 8.5, 0],
];
