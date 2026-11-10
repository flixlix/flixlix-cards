/**
 * The flow lines in pixels: today's line shapes (a straight leg, one curve, a straight leg, sized in
 * units of `scale`), placed on the measured node circles and cut where they meet each ring.
 */

export type Point = { x: number; y: number };

/** A node's circle: centre and outer radius, in the flow overlay's pixels. */
export type Ring = { cx: number; cy: number; r: number };

/** Where the nodes are; measured from the rendered card. Absent rings are nodes the card hides. */
export type FlowLayout = {
  /** Size of the overlay: the card content. */
  width: number;
  height: number;
  /** Where the solar–battery axis crosses the grid–home axis. */
  hub: Point;
  home: Ring;
  grid?: Ring;
  solar?: Ring;
  battery?: Ring;
  rightTop?: Ring;
  rightBottom?: Ring;
};

export type LayoutNodes = {
  grid: boolean;
  solar: boolean;
  battery: boolean;
  /** Individuals in the right column, beside the home. */
  right: boolean;
};

/**
 * Where the card lays its nodes out at a content width: 80px slots spread across rows inside 16px
 * of padding. Used until the rendered card has been measured, and where nothing is laid out.
 */
const nominalRing = (cx: number, cy: number): Ring => ({ cx, cy, r: 40 });

export const nominalLayout = (width: number, nodes: LayoutNodes): FlowLayout => {
  const slots = nodes.right ? 4 : 3;
  const slotX = (index: number) => 56 + (index * (width - 112)) / (slots - 1);
  const hasTopRow = nodes.solar || nodes.right;
  const middle = hasTopRow ? 186 : 56;
  const top = middle - 110;
  const bottom = middle + 110;
  return {
    width,
    height: bottom + 60,
    hub: { x: slotX(1), y: middle },
    home: nominalRing(slotX(2), middle),
    grid: nodes.grid ? nominalRing(slotX(0), middle) : undefined,
    solar: nodes.solar ? nominalRing(slotX(1), top) : undefined,
    battery: nodes.battery ? nominalRing(slotX(1), bottom) : undefined,
    rightTop: nodes.right ? nominalRing(slotX(3), top) : undefined,
    rightBottom: nodes.right ? nominalRing(slotX(3), bottom) : undefined,
  };
};

type Segment = { to: Point; c1?: Point; c2?: Point };
type Path = { start: Point; segments: Segment[] };

/**
 * How far inside its outer edge a line meets a ring: a quarter of the 2px border of an 80px
 * circle (0.5px), scaled with the circle, so a scaled-down card keeps its lines on the border too.
 */
export const ringInset = (ring: Ring) => ring.r / 80;

/** Straight run kept between a curve and the ring it leads into, in pixels. */
const MIN_STRAIGHT = 3;

/** Line shapes in units of `scale`, as the card has always drawn them. */
const CURVE_WIDTH = 30;
const CURVE_PULL = 10;

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** The segment from `from` split at `t` (de Casteljau for curves). */
const split = (from: Point, segment: Segment, t: number): [Segment, Segment, Point] => {
  const { c1, c2, to } = segment;
  if (!c1 || !c2) {
    const at = lerp(from, to, t);
    return [{ to: at }, { to }, at];
  }
  const a = lerp(from, c1, t);
  const b = lerp(c1, c2, t);
  const c = lerp(c2, to, t);
  const ab = lerp(a, b, t);
  const bc = lerp(b, c, t);
  const at = lerp(ab, bc, t);
  return [{ c1: a, c2: ab, to: at }, { c1: bc, c2: c, to }, at];
};

const isInside = (point: Point, ring: Ring) =>
  Math.hypot(point.x - ring.cx, point.y - ring.cy) < ring.r - ringInset(ring);

/** The path from where it first leaves the ring; a path that starts outside is kept whole. */
const trimStart = ({ start, segments }: Path, ring: Ring): Path => {
  let from = start;
  for (const [index, segment] of segments.entries()) {
    if (!isInside(from, ring)) {
      return { start: from, segments: segments.slice(index) };
    }
    if (!isInside(segment.to, ring)) {
      // Inside at 0, outside at 1: bisect to where the segment crosses the ring.
      let inside = 0;
      let outside = 1;
      for (let step = 0; step < 40; step += 1) {
        const middle = (inside + outside) / 2;
        if (isInside(split(from, segment, middle)[2], ring)) {
          inside = middle;
        } else {
          outside = middle;
        }
      }
      const [, rest, at] = split(from, segment, outside);
      return { start: at, segments: [rest, ...segments.slice(index + 1)] };
    }
    from = segment.to;
  }
  return { start: from, segments: [] };
};

/** The same path drawn from its end; each segment's controls swap. */
const reverse = (path: Path): Path =>
  path.segments.reduce<{ reversed: Path; from: Point }>(
    ({ reversed, from }, segment) => ({
      from: segment.to,
      reversed: {
        start: segment.to,
        segments: [
          { to: from, ...(segment.c1 && segment.c2 ? { c1: segment.c2, c2: segment.c1 } : {}) },
          ...reversed.segments,
        ],
      },
    }),
    { reversed: { start: path.start, segments: [] }, from: path.start }
  ).reversed;

/** The path between two rings, cut where it leaves the first and where it enters the second. */
const between = (path: Path, from: Ring, to: Ring): Path =>
  reverse(trimStart(reverse(trimStart(path, from)), to));

const round = (value: number) => Math.round(value * 100) / 100;
const xy = ({ x, y }: Point) => `${round(x)},${round(y)}`;

const toD = ({ start, segments }: Path): string =>
  `M${xy(start)}${segments
    .map(({ c1, c2, to }) => (c1 && c2 ? ` C${xy(c1)} ${xy(c2)} ${xy(to)}` : ` L${xy(to)}`))
    .join("")}`;

/** A straight line between the centres of two rings, at `x`/`y` where given. */
const straight = (from: Ring, to: Ring, at: Partial<Point> = {}): Path => ({
  start: { x: at.x ?? from.cx, y: at.y ?? from.cy },
  segments: [{ to: { x: at.x ?? to.cx, y: at.y ?? to.cy } }],
});

/**
 * From a node above or below to a node beside: down (or up) at `x`, a curve `height` tall that
 * turns towards `to`, then across at `y` into `to`.
 */
const elbow = (from: Ring, to: Ring, x: number, y: number, height: number, size: number): Path => {
  const across = Math.sign(to.cx - x);
  const down = Math.sign(y - from.cy);
  return {
    start: { x, y: from.cy },
    segments: [
      { to: { x, y: y - down * height } },
      {
        c1: { x, y },
        c2: { x: x + across * CURVE_PULL * size, y },
        to: { x: x + across * CURVE_WIDTH * size, y },
      },
      { to: { x: to.cx, y } },
    ],
  };
};

/** The tallest a line runs from the hub's axis before its curve starts, in units. */
const TURN_REACH = 35;

/**
 * Pixels per line unit: the card's long-standing proportions (the line box spans the gap between
 * the nodes plus 3% across, 6% down), shrunk where a curve would start beyond the centre of the
 * node it leaves. Curves shrink further on their own where they would reach the ring beside them.
 */
export const flowScale = ({ hub, home, solar, battery, rightTop }: FlowLayout): number => {
  const across = 2 * (home.cx - home.r - hub.x) * 1.03;
  const top = solar ? hub.y - solar.cy - solar.r : undefined;
  const bottom = battery ? battery.cy - battery.r - hub.y : undefined;
  const down = 2 * (top ?? bottom ?? 70) * 1.06;
  const verticals = [solar, battery, rightTop]
    .filter((node) => node !== undefined)
    .map((node) => Math.abs(home.cy - node.cy) / TURN_REACH);
  return Math.max(0, Math.min(Math.max(across, down) / 100, ...verticals));
};

/** A flow line's SVG path data, and the same line drawn from its other end for dots running back. */
export type FlowLine = { d: string; reversed: string };

export type FlowPaths = {
  /** Pixels per line unit; flow dots have a radius of one unit. */
  scale: number;
  solarToHome?: FlowLine;
  solarToGrid?: FlowLine;
  solarToBattery?: FlowLine;
  gridToHome?: FlowLine;
  batteryToHome?: FlowLine;
  batteryToGrid?: FlowLine;
  rightTopToHome?: FlowLine;
  rightBottomToHome?: FlowLine;
};

const flowLine = (path: Path): FlowLine => ({ d: toD(path), reversed: toD(reverse(path)) });

/**
 * An elbow line from `from` into `to`, cut at both rings: down (or up) at `x`, a curve `curve`
 * units tall, across at `y`. The curve keeps the card's scale unless that would bring it closer
 * than `MIN_STRAIGHT` to the ring it leads into; then it shrinks, its line keeping its place.
 */
const elbowLine = (
  from: Ring,
  to: Ring,
  { x, y, curve, scale }: { x: number; y: number; curve: number; scale: number }
) => {
  const room = Math.abs(to.cx - x) - to.r - MIN_STRAIGHT;
  const size = Math.max(0, Math.min(scale, room / CURVE_WIDTH));
  return flowLine(between(elbow(from, to, x, y, curve * size, size), from, to));
};

/** A straight line from `from` into `to`, cut at both rings. */
export const straightLine = (from: Ring, to: Ring, at: Partial<Point> = {}) =>
  flowLine(between(straight(from, to, at), from, to));

type Lines = Omit<FlowPaths, "scale">;

const solarLines = ({ hub, home, grid, solar, battery }: FlowLayout, scale: number): Lines => {
  if (!solar) {
    return {};
  }
  // Solar's lines run 5 units either side of its axis, 3 without a battery line next to them.
  const offset = (battery ? 5 : 3) * scale;
  // Without a battery the curves are 35 units tall and the line to the home ends on its axis.
  const curve = battery ? 30 : 35;
  const turn = (grid ? 15 : 17) - 50;
  return {
    solarToHome: elbowLine(solar, home, {
      x: hub.x + offset,
      y: hub.y + (turn + curve) * scale,
      curve,
      scale,
    }),
    solarToGrid: grid
      ? elbowLine(solar, grid, {
          x: hub.x - offset,
          y: hub.y + (curve - 35) * scale,
          curve,
          scale,
        })
      : undefined,
    solarToBattery: battery ? straightLine(solar, battery, { x: hub.x }) : undefined,
  };
};

const gridLines = ({ hub, home, grid, solar, battery }: FlowLayout, scale: number): Lines => {
  if (!grid) {
    return {};
  }
  // Without a battery, the solar line enters the home on its axis, so the grid line goes below it.
  const below = solar && !battery ? 6 : 0;
  return { gridToHome: straightLine(grid, home, { y: hub.y + below * scale }) };
};

const batteryLines = ({ hub, home, grid, battery }: FlowLayout, scale: number): Lines => {
  if (!battery) {
    return {};
  }
  const turn = 50 - (grid ? 15 : 17);
  return {
    batteryToHome: elbowLine(battery, home, {
      x: hub.x + 5 * scale,
      y: hub.y + (turn - 30) * scale,
      curve: 30,
      scale,
    }),
    batteryToGrid: grid
      ? elbowLine(battery, grid, { x: hub.x - 5 * scale, y: hub.y + 5 * scale, curve: 30, scale })
      : undefined,
  };
};

/** Lines from the right column run down (or up) its axis and into the home's right side. */
const rightLines = (
  { home, rightTop, rightBottom }: FlowLayout,
  scale: number,
  hasBottomRow: boolean
): Lines => {
  const curve = hasBottomRow ? 30 : 35;
  return {
    rightTopToHome: rightTop
      ? elbowLine(rightTop, home, {
          x: rightTop.cx,
          y: home.cy + (curve - 35) * scale,
          curve,
          scale,
        })
      : undefined,
    rightBottomToHome: rightBottom
      ? elbowLine(rightBottom, home, {
          x: rightBottom.cx,
          y: home.cy + 5 * scale,
          curve: 30,
          scale,
        })
      : undefined,
  };
};

/** Every flow line the layout has nodes for, as SVG path data in the overlay's pixels. */
export const flowPaths = (
  layout: FlowLayout,
  { hasBottomRow }: { hasBottomRow: boolean }
): FlowPaths => {
  const scale = flowScale(layout);
  return {
    scale,
    ...solarLines(layout, scale),
    ...gridLines(layout, scale),
    ...batteryLines(layout, scale),
    ...rightLines(layout, scale, hasBottomRow),
  };
};
