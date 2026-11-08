import { type HouseNode } from "@flixlix-cards/shared/card-state";
import { type ChargeLevel } from "@flixlix-cards/shared/utils/severity";
import { mdiFlash, mdiHome } from "@mdi/js";

/** A point in house space: x along the ridge, y towards the viewer's left, z up. */
export type Point = readonly [x: number, y: number, z: number];
export type ScreenPoint = readonly [x: number, y: number];

const COS_30 = Math.cos(Math.PI / 6);
/** Screen units per house unit. */
const UNIT = 10;

export const project = ([x, y, z]: Point): ScreenPoint => [
  (x - y) * COS_30 * UNIT,
  (x + y) * 0.5 * UNIT - z * UNIT,
];

const round2 = (value: number) => Math.round(value * 100) / 100;
const pointText = ([x, y]: ScreenPoint) => `${round2(x)} ${round2(y)}`;

/** The point `distance` from `from` towards `to`. */
const towards = (from: ScreenPoint, to: ScreenPoint, distance: number): ScreenPoint => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [
    from[0] + ((to[0] - from[0]) * distance) / length,
    from[1] + ((to[1] - from[1]) * distance) / length,
  ];
};

/**
 * An SVG path through `points` with each bend rounded by `radius`, never more than half of the
 * segments on either side, so short steps stay sensible.
 */
export const roundedPath = (points: readonly ScreenPoint[], radius: number): string => {
  const [first, ...rest] = points;
  if (!first) {
    return "";
  }
  const bends = rest.slice(0, -1).map((corner, index) => {
    const before = points[index] ?? corner;
    const after = points[index + 2] ?? corner;
    const reach = Math.min(
      radius,
      Math.hypot(corner[0] - before[0], corner[1] - before[1]) / 2,
      Math.hypot(after[0] - corner[0], after[1] - corner[1]) / 2
    );
    return `L${pointText(towards(corner, before, reach))}Q${pointText(corner)} ${pointText(towards(corner, after, reach))}`;
  });
  const last = rest[rest.length - 1];
  return `M${pointText(first)}${bends.join("")}${last ? `L${pointText(last)}` : ""}`;
};

/** Maps a face's own 2D coordinates (along the face, down) onto the screen, for icons. */
export const faceTransform = (face: "front" | "gable", at: Point): string => {
  const [e, f] = project(at);
  const along = face === "front" ? COS_30 * UNIT : -COS_30 * UNIT;
  return `matrix(${along},${0.5 * UNIT},0,${UNIT},${e},${f})`;
};

/** A filled polygon; `fill` names a colour or gradient of the card's stylesheet. */
export type Face = { kind: "face"; points: Point[]; fill: string };
export type Icon = { kind: "icon"; face: "front" | "gable"; at: Point; size: number; path: string };
export type Shape = Face | Icon;

/** A part of the house, one group per node so each can be clicked on its own. */
export type SceneGroup = { node: HouseNode | "inverter" | "outlet"; shapes: Shape[] };

const face = (fill: string, ...points: Point[]): Face => ({ kind: "face", points, fill });

/** A box from (x, y, z) with width along x, depth along y and height; only its visible faces. */
const box = (
  [x, y, z]: Point,
  [w, d, h]: Point,
  fills = { top: "box-top", front: "box-front", side: "box-side" }
): Face[] => [
  face(fills.side, [x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]),
  face(fills.front, [x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]),
  face(fills.top, [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]),
];

/** Height of the gable roof above (x, y): ridge along x at y = 4. */
export const roofHeight = (y: number): number => 8.6 - Math.abs(y - 4) * 0.85;

/** The house is 11 long, 8 deep and 5.2 to the eaves; the front wall faces y = 8. */
const FRONT = 8;
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
const onRoof = (x: number, y: number): Point => [x, y, roofHeight(y) + 0.05];

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

const onBattery = (y: number, z: number, offset = 0): Point => [BATTERY_FACE_X + offset, y, z];

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
const INVERTER_Y = (INVERTER.y0 + INVERTER.y1) / 2;
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

/** What the house shows: panels with solar, the battery when there is one. */
export type ScenePresence = { solar: boolean; battery?: BatteryLook };

/** Walls and roof: drawn before the wires, which run on them. */
export const houseShell = (): SceneGroup => ({ node: "home", shapes: house() });

/**
 * What the wires connect, drawn over the wires: each wire runs into its fixture, so the fixture
 * hides the wire's end the way it would in 3D.
 */
export const fixtures = ({ solar, battery: look }: ScenePresence): SceneGroup[] => [
  ...(solar ? [{ node: "solar" as const, shapes: panels() }] : []),
  ...(look ? [{ node: "battery" as const, shapes: battery(look) }] : []),
  { node: "outlet", shapes: outlet() },
  { node: "inverter", shapes: inverter() },
];

/** The grid cable runs on past the card's edge, fading out after its label points at it. */
const GRID_CABLE_END = 40;
const GRID_LABEL_X = 18;
export const GRID_CABLE_START: Point = [LENGTH + 0.07, INVERTER_Y, 0.02];
const ON_FRONT = FRONT + 0.07;
const ON_GABLE = LENGTH + 0.07;

/**
 * Each wire's route from its node to the inverter, along walls and ground. They meet the inverter
 * from four sides: solar from above, the battery from the back, home round the front corner and
 * the grid from below. A wire ends on the surface of a fixture it lies in front of and runs into
 * one it passes behind; `DRAW_ORDER` stacks them to match.
 */
export const WIRE_ROUTES: Record<HouseNode, Point[]> = {
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
};

/**
 * Wires and fixtures from back to front, over the walls and roof. Each wire sits over the fixtures
 * it lies in front of and under those it runs into, as in 3D.
 */
export const DRAW_ORDER: readonly ({ wire: HouseNode } | { part: SceneGroup["node"] })[] = [
  { wire: "grid" }, // up into the inverter from below
  { part: "battery" },
  { wire: "battery" }, // from the battery's visible side into the inverter's back
  { part: "inverter" },
  { part: "outlet" },
  { wire: "home" }, // onto the inverter's and the outlet's visible sides
  { wire: "solar" }, // onto the inverter's top, from under the panels
  { part: "solar" },
];

/**
 * Where each node's label hangs: the leader line starts at `at` and runs `leader` screen units up
 * (negative) or down, with the label's text running right from it. The anchors keep leaders and
 * labels clear of the wires, the panels and each other.
 */
export const LABEL_ANCHORS: Record<HouseNode, { at: Point; leader: number }> = {
  solar: { at: onRoof(4.2, PANELS.y0), leader: -40 },
  home: { at: [8.1, FRONT + 0.13, 2.35], leader: 44 },
  battery: { at: onBattery(1.8, 3.3), leader: -50 },
  // above the cable, out past the battery: the cable falls away under the label
  grid: { at: [GRID_LABEL_X, INVERTER_Y, 0], leader: -20 },
};

/** The house's footprint and the shadow it casts towards the back right. */
export const SHADOW: Point[] = [
  [0, 0, 0],
  [LENGTH, 0, 0],
  [17, 3, 0],
  [17, 11, 0],
  [LENGTH, 8.5, 0],
  [0, 8.5, 0],
];
