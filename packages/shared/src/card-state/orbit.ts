export type OrbitPoint = { x: number; y: number };

/** Where a device's circle is centred, and whether its name sits above the circle or below it. */
export type OrbitPlace = OrbitPoint & { labelAbove: boolean };

export type OrbitRect = { left: number; top: number; right: number; bottom: number };

export type OrbitGeometry = {
  width: number;
  height: number;
  /** How much the devices' circles are scaled down from their normal 80px; 1 is full size. */
  scale: number;
  home: OrbitPoint;
  devices: OrbitPlace[];
  rings: 1 | 2;
  /**
   * Below 1 when so many devices were given that the box outgrew the card even with the smallest
   * circles: the whole box is then drawn shrunk by this factor to fit.
   */
  fit: number;
};

export const ORBIT_NODE_SIZE = 80;
/** Home Assistant pads the card content by this much on each side. */
export const CARD_CONTENT_PADDING = 16;

const HOME_RADIUS = ORBIT_NODE_SIZE / 2;
const LABEL_HEIGHT = 20;
const MAX_CONTENT_WIDTH = 470;
const UNMEASURED_CARD_WIDTH = 400;

const MARGIN = 8;
const GAP = 12;
const RING_GAP = 14;
const CLEARANCE = 4;
/** Straight line kept visible between the home and the circles nearest to it. */
const LINE_ROOM = 28;
/** How far from the home a few devices sit, instead of spreading to the card's edge. */
const COMFORTABLE_RADIUS = 120;

const SINGLE_RING_MIN_SCALE = 0.7;
const MIN_SCALE = 0.4;
const SCALE_STEP = 0.025;
const RADIUS_STEP = 2;
const GROWTH_LIMIT = 1000;
const START_ANGLE = -Math.PI / 2;

type Ring = { radius: number; angles: number[] };

const HOME: OrbitPoint = { x: 0, y: 0 };

const polar = (radius: number, angle: number): OrbitPoint => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});

const distance = (a: OrbitPoint, b: OrbitPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const pairs = <T>(items: readonly T[]): [T, T][] =>
  items.flatMap((first, index) => items.slice(index + 1).map((second): [T, T] => [first, second]));

const evenAngles = (count: number, offset = 0): number[] =>
  Array.from({ length: count }, (_, index) => START_ANGLE + offset + (index * 2 * Math.PI) / count);

const scalesFrom = (from: number, to: number): number[] =>
  Array.from(
    { length: Math.floor((from - to) / SCALE_STEP + 1e-9) + 1 },
    (_, index) => from - index * SCALE_STEP
  );

const distanceToRect = (point: OrbitPoint, rect: OrbitRect): number =>
  Math.hypot(
    Math.max(rect.left - point.x, 0, point.x - rect.right),
    Math.max(rect.top - point.y, 0, point.y - rect.bottom)
  );

const rectsApart = (a: OrbitRect, b: OrbitRect, gap: number): boolean =>
  a.right + gap <= b.left ||
  b.right + gap <= a.left ||
  a.bottom + gap <= b.top ||
  b.bottom + gap <= a.top;

const grown = (rect: OrbitRect, by: number): OrbitRect => ({
  left: rect.left - by,
  top: rect.top - by,
  right: rect.right + by,
  bottom: rect.bottom + by,
});

const distanceToLine = (point: OrbitPoint, end: OrbitPoint): number => {
  const length = Math.hypot(end.x, end.y);
  const along = (point.x * end.x + point.y * end.y) / length;
  return along <= 0 ? distance(point, HOME) : Math.abs(point.x * end.y - point.y * end.x) / length;
};

/** Liang–Barsky clipping of the line from the home to `end` against `rect`. */
const lineCrosses = (end: OrbitPoint, rect: OrbitRect): boolean => {
  const edges: [number, number][] = [
    [-end.x, -rect.left],
    [end.x, rect.right],
    [-end.y, -rect.top],
    [end.y, rect.bottom],
  ];
  const parallelOutside = edges.some(([direction, room]) => direction === 0 && room < 0);
  const enter = Math.max(
    0,
    ...edges.filter(([direction]) => direction < 0).map(([direction, room]) => room / direction)
  );
  const exit = Math.min(
    1,
    ...edges.filter(([direction]) => direction > 0).map(([direction, room]) => room / direction)
  );
  return !parallelOutside && enter <= exit;
};

const radiiFrom = (from: number, to: number): number[] =>
  Array.from(
    { length: Math.max(0, Math.floor((to - from) / RADIUS_STEP) + 1) },
    (_, index) => from + index * RADIUS_STEP
  );

const radiusOf = (scale: number): number => (ORBIT_NODE_SIZE * scale) / 2;

/**
 * Where a device's name sits: as wide as its circle, above it in the upper half of the orbit and
 * below it elsewhere, so it is never between the circle and the home.
 */
export const orbitLabelRect = (place: OrbitPlace, scale: number): OrbitRect => {
  const radius = radiusOf(scale);
  const height = LABEL_HEIGHT * scale;
  const top = place.labelAbove ? place.y - radius - height : place.y + radius;
  return { left: place.x - radius, right: place.x + radius, top, bottom: top + height };
};

const placesAround = (rings: Ring[], count: number): OrbitPlace[] =>
  rings
    .flatMap((ring) => ring.angles.map((angle) => polar(ring.radius, angle)))
    .slice(0, count)
    .map((point) => ({ x: point.x, y: point.y, labelAbove: point.y < -1 }));

const circlesApart = (places: OrbitPlace[], radius: number): boolean =>
  pairs(places).every(([a, b]) => distance(a, b) >= 2 * radius + GAP);

const labelsClear = (places: OrbitPlace[], labels: OrbitRect[], radius: number): boolean =>
  pairs(labels).every(([a, b]) => rectsApart(a, b, CLEARANCE)) &&
  labels.every(
    (label, index) =>
      distanceToRect(HOME, label) >= HOME_RADIUS + CLEARANCE &&
      places.every(
        (place, other) => other === index || distanceToRect(place, label) >= radius + CLEARANCE
      )
  );

const linesClear = (places: OrbitPlace[], labels: OrbitRect[], radius: number): boolean =>
  places.every(
    (target, index) =>
      places.every(
        (other, otherIndex) =>
          otherIndex === index || distanceToLine(other, target) >= radius + CLEARANCE
      ) && labels.every((label) => !lineCrosses(target, grown(label, CLEARANCE)))
  );

/** Whether no circle, name or line around the home runs into another. */
const isClear = (places: OrbitPlace[], scale: number): boolean => {
  const radius = radiusOf(scale);
  const labels = places.map((place) => orbitLabelRect(place, scale));
  return (
    circlesApart(places, radius) &&
    labelsClear(places, labels, radius) &&
    linesClear(places, labels, radius)
  );
};

const maxRingRadius = (width: number, diameter: number): number =>
  width / 2 - MARGIN - diameter / 2;

const minRingRadius = (diameter: number): number => HOME_RADIUS + diameter / 2 + LINE_ROOM;

/** The radius at which `count` circles side by side keep `GAP` between them; a lower bound. */
const chordRadius = (count: number, diameter: number): number =>
  count < 2 ? 0 : (diameter + GAP) / (2 * Math.sin(Math.PI / count));

const singleRing = (count: number, width: number, scale: number): Ring[] | undefined => {
  const diameter = ORBIT_NODE_SIZE * scale;
  const outermost = maxRingRadius(width, diameter);
  const start = Math.max(
    minRingRadius(diameter),
    chordRadius(count, diameter),
    Math.min(outermost, COMFORTABLE_RADIUS)
  );
  return radiiFrom(start, outermost + 0.01)
    .map((radius) => [{ radius, angles: evenAngles(count) }])
    .find((rings) => isClear(placesAround(rings, count), scale));
};

/**
 * Two rings with as many places each, the outer one turned half a step: every line out to an outer
 * circle then runs midway between two inner circles. An odd number of devices leaves the last
 * outer place empty. The first half of the devices, the heaviest when sorted, take the inner ring.
 */
const twoRings = (count: number, innerRadius: number, outerRadius: number): Ring[] => {
  const places = Math.ceil(count / 2);
  return [
    { radius: innerRadius, angles: evenAngles(places) },
    { radius: outerRadius, angles: evenAngles(places, Math.PI / places).slice(0, count - places) },
  ];
};

const doubleRing = (count: number, width: number, scale: number): Ring[] | undefined => {
  const diameter = ORBIT_NODE_SIZE * scale;
  const outerRadius = maxRingRadius(width, diameter);
  const innerRadius = outerRadius - diameter - RING_GAP;
  if (count < 4 || innerRadius < minRingRadius(diameter)) {
    return undefined;
  }
  const rings = twoRings(count, innerRadius, outerRadius);
  return isClear(placesAround(rings, count), scale) ? rings : undefined;
};

const crowdedRings = (count: number, width: number): Ring[] => {
  const diameter = ORBIT_NODE_SIZE * MIN_SCALE;
  const start = Math.max(
    maxRingRadius(width, diameter),
    minRingRadius(diameter) + diameter + RING_GAP
  );
  const candidates = radiiFrom(start, start + GROWTH_LIMIT).map((outer) =>
    twoRings(count, outer - diameter - RING_GAP, outer)
  );
  return (
    candidates.find((rings) => isClear(placesAround(rings, count), MIN_SCALE)) ??
    twoRings(count, start - diameter - RING_GAP, start)
  );
};

const chooseLayout = (count: number, width: number): { scale: number; rings: Ring[] } => {
  for (const scale of scalesFrom(1, SINGLE_RING_MIN_SCALE)) {
    const rings = singleRing(count, width, scale);
    if (rings) {
      return { scale, rings };
    }
  }
  for (const scale of scalesFrom(1, MIN_SCALE)) {
    const rings = doubleRing(count, width, scale);
    if (rings) {
      return { scale, rings };
    }
  }
  return { scale: MIN_SCALE, rings: crowdedRings(count, width) };
};

/** The width the orbit has inside a card of `cardWidth`, which is measured with its padding. */
export const orbitWidth = (cardWidth: number): number =>
  Math.min(
    (cardWidth > 0 ? cardWidth : UNMEASURED_CARD_WIDTH) - 2 * CARD_CONTENT_PADDING,
    MAX_CONTENT_WIDTH
  );

/**
 * Places `count` devices on rings around the home, the first at the top and the rest clockwise.
 * Circles shrink, and a second ring is added, as devices are added until no circle, name or line
 * touches another. Plain pixels, so the card and its tests share one source of truth.
 */
export const orbitGeometry = (cardWidth: number, count: number): OrbitGeometry => {
  const width = orbitWidth(cardWidth);
  const { scale, rings } = chooseLayout(Math.max(count, 0), width);
  const places = placesAround(rings, count);
  const radius = radiusOf(scale);
  const labelHeight = LABEL_HEIGHT * scale;

  const above = Math.max(
    HOME_RADIUS,
    ...places.map((place) => radius + (place.labelAbove ? labelHeight : 0) - place.y)
  );
  const below = Math.max(
    HOME_RADIUS + (count <= 1 ? LABEL_HEIGHT : 0),
    ...places.map((place) => place.y + radius + (place.labelAbove ? 0 : labelHeight))
  );
  const widest = Math.max(0, ...places.map((place) => Math.abs(place.x) + radius));
  const boxWidth = Math.max(width, 2 * (MARGIN + widest));
  const home = { x: boxWidth / 2, y: MARGIN + above };
  return {
    width: boxWidth,
    height: MARGIN + above + below + MARGIN,
    scale,
    home,
    devices: places.map((place) => ({
      x: home.x + place.x,
      y: home.y + place.y,
      labelAbove: place.labelAbove,
    })),
    rings: rings.length === 2 ? 2 : 1,
    fit: width / boxWidth,
  };
};
