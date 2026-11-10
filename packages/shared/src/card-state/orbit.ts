/**
 * Where the individual devices sit around the home when the card has no grid, solar or battery:
 * the home in the middle and every device on a ring around it, however many there are.
 *
 * Pure geometry in pixels, so the rendered card and its tests share one source of truth. Every
 * point is the centre of a node's circle, measured from the top left of the orbit box.
 */

export type OrbitPoint = { x: number; y: number };

export type OrbitGeometry = {
  /** Size of the orbit box the nodes are placed in. */
  width: number;
  height: number;
  /** How much the devices' circles are scaled down from their normal 80px; 1 is full size. */
  scale: number;
  home: OrbitPoint;
  /** One per device, in the order given. */
  devices: OrbitPoint[];
  /** How many rings the devices were spread over. */
  rings: 1 | 2;
  /**
   * Below 1 when so many devices were given that the box outgrew the card even with the smallest
   * circles: the whole box is then drawn shrunk by this factor to fit.
   */
  fit: number;
};

/** Diameter of a circle at scale 1, and the height a label takes under it. */
export const ORBIT_NODE_SIZE = 80;
const LABEL_HEIGHT = 20;

/** Space kept free at the edges of the box. */
const MARGIN = 8;
/** Free space between neighbouring circles, and between the inner and the outer ring. */
const GAP = 12;
const RING_GAP = 14;
/** Straight line kept visible between the home and the circles nearest to it. */
const LINE_ROOM = 28;
/** How far from the home a few devices sit, instead of spreading to the card's edge. */
const COMFORTABLE_RADIUS = 120;

/** Cards are drawn at most this wide, and at this width until they have been measured. */
const MAX_WIDTH = 470;
const DEFAULT_WIDTH = 400;

/** Circles shrink down to these scales: a single ring until `SINGLE_RING_MIN_SCALE`, then two. */
const SINGLE_RING_MIN_SCALE = 0.7;
const MIN_SCALE = 0.4;
const SCALE_STEP = 0.025;

const START_ANGLE = -Math.PI / 2;

type Ring = { radius: number; angles: number[] };

const polar = (radius: number, angle: number): OrbitPoint => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});

/** The radius at which `count` circles of `diameter` sit side by side with `GAP` between them. */
const chordRadius = (count: number, diameter: number): number =>
  count < 2 ? 0 : (diameter + GAP) / (2 * Math.sin(Math.PI / count));

const evenAngles = (count: number, offset = 0): number[] =>
  Array.from({ length: count }, (_, index) => START_ANGLE + offset + (index * 2 * Math.PI) / count);

/** The farthest a device's centre can be from the home and still fit inside the box. */
const reach = (width: number, diameter: number): number => width / 2 - MARGIN - diameter / 2;
const nearest = (diameter: number): number => ORBIT_NODE_SIZE / 2 + diameter / 2 + LINE_ROOM;

const singleRing = (count: number, width: number, scale: number): Ring[] | undefined => {
  const diameter = ORBIT_NODE_SIZE * scale;
  const room = reach(width, diameter);
  const radius = Math.max(
    nearest(diameter),
    chordRadius(count, diameter),
    Math.min(room, COMFORTABLE_RADIUS)
  );
  return radius <= room + 0.01 ? [{ radius, angles: evenAngles(count) }] : undefined;
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
  const places = Math.ceil(count / 2);
  const outerRadius = reach(width, diameter);
  const innerRadius = outerRadius - diameter - RING_GAP;
  const fits = innerRadius >= Math.max(nearest(diameter), chordRadius(places, diameter));
  return places >= 2 && fits ? twoRings(count, innerRadius, outerRadius) : undefined;
};

/** Every scale from `from` down to `to`, a step apart. */
const scales = (from: number, to: number): number[] =>
  Array.from(
    { length: Math.floor((from - to) / SCALE_STEP + 1e-9) + 1 },
    (_, index) => from - index * SCALE_STEP
  );

/** The largest circles the devices fit at: one ring while they stay reasonably big, else two. */
const choose = (count: number, width: number): { scale: number; rings: Ring[] } => {
  for (const scale of scales(1, SINGLE_RING_MIN_SCALE)) {
    const rings = singleRing(count, width, scale);
    if (rings) {
      return { scale, rings };
    }
  }
  for (const scale of scales(1, MIN_SCALE)) {
    const rings = doubleRing(count, width, scale);
    if (rings) {
      return { scale, rings };
    }
  }
  // More devices than fit: keep the smallest circles on two rings and let the box outgrow the card.
  const diameter = ORBIT_NODE_SIZE * MIN_SCALE;
  const places = Math.max(2, Math.ceil(count / 2));
  const innerRadius = Math.max(nearest(diameter), chordRadius(places, diameter));
  const outerRadius = innerRadius + diameter + RING_GAP;
  return { scale: MIN_SCALE, rings: twoRings(count, innerRadius, outerRadius) };
};

/** The orbit box's width for a card of `cardWidth`; 0 before the card has been measured. */
export const orbitWidth = (cardWidth: number): number =>
  Math.min(cardWidth > 0 ? cardWidth : DEFAULT_WIDTH, MAX_WIDTH);

/**
 * Places `count` devices on rings around the home in a box of at most `cardWidth`, the first at
 * the top and the rest clockwise. Circles shrink, and a second ring is added, as devices are added.
 */
export const orbitGeometry = (cardWidth: number, count: number): OrbitGeometry => {
  const width = orbitWidth(cardWidth);
  const { scale, rings } = choose(Math.max(count, 0), width);
  const diameter = ORBIT_NODE_SIZE * scale;

  // Devices are dealt to the rings from the inside out.
  const around = rings
    .flatMap((ring) => ring.angles.map((angle) => polar(ring.radius, angle)))
    .slice(0, count);

  const above = Math.max(ORBIT_NODE_SIZE / 2, ...around.map((point) => diameter / 2 - point.y));
  const below = Math.max(
    ORBIT_NODE_SIZE / 2 + LABEL_HEIGHT,
    ...around.map((point) => point.y + diameter / 2 + LABEL_HEIGHT * scale)
  );
  const widest = Math.max(0, ...around.map((point) => Math.abs(point.x) + diameter / 2));
  // The box only grows beyond the card when more devices were given than fit at the smallest size.
  const boxWidth = Math.max(width, 2 * (MARGIN + widest));
  const homeY = MARGIN + above;
  return {
    width: boxWidth,
    height: homeY + below + MARGIN,
    scale,
    home: { x: boxWidth / 2, y: homeY },
    devices: around.map((point) => ({ x: boxWidth / 2 + point.x, y: homeY + point.y })),
    rings: rings.length === 2 ? 2 : 1,
    fit: width / boxWidth,
  };
};
