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
export type Icon = {
  kind: "icon";
  face: "front" | "gable";
  at: Point;
  size: number;
  path: string;
  /** Turns about its centre, as the heat pump's fan does while it runs. */
  spin?: boolean;
};
export type Shape = Face | Icon;

export const face = (fill: string, ...points: Point[]): Face => ({ kind: "face", points, fill });

/** A box from (x, y, z) with width along x, depth along y and height; only its visible faces. */
export const box = (
  [x, y, z]: Point,
  [w, d, h]: Point,
  fills = { top: "box-top", front: "box-front", side: "box-side" }
): Face[] => [
  face(fills.side, [x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]),
  face(fills.front, [x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]),
  face(fills.top, [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]),
];
