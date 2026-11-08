import { type HouseNode } from "@flixlix-cards/shared/card-state";
import { mdiBatteryHigh, mdiFlash, mdiHome } from "@mdi/js";

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

/** The house, one group per node so each can be clicked on its own. */
export type SceneGroup = { node: HouseNode | "inverter"; shapes: Shape[] };

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
  // the plate on the front wall where the home wire ends
  ...box([7.6, FRONT, 2.35], [1, 0.12, 1]),
  { kind: "icon", face: "front", at: [8.1, FRONT + 0.13, 2.85], size: 0.55, path: mdiHome },
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

/** `soc` in [0, 1], or null without a state of charge entity. */
const battery = (soc: number | null): Shape[] => [
  ...box([LENGTH, 1, 0.5], [0.45, 1.6, 2.8]),
  { kind: "icon", face: "gable", at: onBattery(1.65, 2), size: 0.9, path: mdiBatteryHigh },
  face(
    "soc-track",
    onBattery(SOC_STRIP.y0, SOC_STRIP.z0),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z0),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z1),
    onBattery(SOC_STRIP.y0, SOC_STRIP.z1)
  ),
  ...(soc === null
    ? []
    : [socFill(SOC_STRIP.z0 + (SOC_STRIP.z1 - SOC_STRIP.z0) * Math.min(Math.max(soc, 0), 1), soc)]),
];

const LOW_STATE_OF_CHARGE = 0.15;
const socFill = (top: number, soc: number): Face =>
  face(
    soc > LOW_STATE_OF_CHARGE ? "soc" : "soc-low",
    onBattery(SOC_STRIP.y0, SOC_STRIP.z0, 0.01),
    onBattery(SOC_STRIP.y1, SOC_STRIP.z0, 0.01),
    onBattery(SOC_STRIP.y1, top, 0.01),
    onBattery(SOC_STRIP.y0, top, 0.01)
  );

/** Where every wire meets, on the gable wall. */
const INVERTER = { y0: 4.5, y1: 5.6, z0: 2.3, z1: 3.4 } as const;
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

export type ScenePresence = { solar: boolean; battery: boolean; soc: number | null };

export const sceneGroups = ({ solar, battery: hasBattery, soc }: ScenePresence): SceneGroup[] => [
  { node: "home", shapes: house() },
  ...(solar ? [{ node: "solar" as const, shapes: panels() }] : []),
  ...(hasBattery ? [{ node: "battery" as const, shapes: battery(soc) }] : []),
  { node: "inverter", shapes: inverter() },
];

/** The grid cable runs on past the card's edge; its label sits on it at GRID_LABEL_X. */
const GRID_CABLE_END = 40;
const GRID_LABEL_X = 16;
const ON_FRONT = FRONT + 0.07;
const ON_GABLE = LENGTH + 0.07;

/**
 * Each wire's route from its node to the inverter, along walls and ground. They meet the inverter
 * from four sides: solar from above, the battery from the back, home round the front corner and
 * the grid from below.
 */
export const WIRE_ROUTES: Record<HouseNode, Point[]> = {
  // from the panels along the roof, parallel to its ridge, then down the gable: one bend
  solar: [
    onRoof(PANELS.x1, INVERTER_Y),
    onRoof(ON_GABLE, INVERTER_Y),
    [ON_GABLE, INVERTER_Y, INVERTER.z1],
  ],
  battery: [
    [ON_GABLE, 2.6, INVERTER_Z],
    [ON_GABLE, INVERTER.y0, INVERTER_Z],
  ],
  home: [
    [8.6, ON_FRONT, INVERTER_Z],
    [LENGTH - 0.03, ON_FRONT, INVERTER_Z],
    [ON_GABLE, FRONT - 0.03, INVERTER_Z],
    [ON_GABLE, INVERTER.y1, INVERTER_Z],
  ],
  grid: [
    [GRID_CABLE_END, INVERTER_Y, 0.02],
    [ON_GABLE, INVERTER_Y, 0.02],
    [ON_GABLE, INVERTER_Y, INVERTER.z0],
  ],
};

/**
 * Where each node's label hangs: the leader line starts at `at` and runs `leader` screen units up
 * (negative) or down; with no leader the label sits centred on `at`. The anchors keep leaders
 * clear of the wires and the panels.
 */
export const LABEL_ANCHORS: Record<HouseNode, { at: Point; leader: number }> = {
  solar: { at: onRoof(4.2, PANELS.y0), leader: -40 },
  home: { at: [8.1, FRONT + 0.13, 2.35], leader: 44 },
  battery: { at: onBattery(1.8, 3.3), leader: -50 },
  grid: { at: [GRID_LABEL_X, INVERTER_Y, 0], leader: 0 },
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
