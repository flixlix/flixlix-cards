import { type HouseWire } from "@flixlix-cards/shared/card-state";
import { nothing, svg } from "lit";
import { type Box } from "./extent";
import { offsetLine } from "./geometry";
import {
  GRID_CABLE_START,
  GRID_FADE_FROM,
  type Point,
  project,
  roundedPath,
  type SceneLayout,
  wireRoute,
} from "./scene";

/** How round a wire's bends are, in screen units. */
const BEND_RADIUS = 4;

/**
 * A pulse's length grows with its wire's power; the pattern's period matches the animation's
 * offset in the stylesheet, so the loop stays seamless whatever the length.
 */
const PULSE = { shortest: 6, longest: 36, period: 70 } as const;

/** Pulses travel this many times slower than the flow rate's seconds per dot. */
const PULSE_SLOWDOWN = 2.5;

/** Screen units between the middles of a node's two lanes, at a wire scale of 1. */
const LANE_GAP = 3;

// reduceRight: toReversed needs Chrome 110 and reverse mutates.
const reversed = <T>(points: readonly T[]): T[] =>
  points.reduceRight<T[]>((list, point) => list.concat([point]), []);

/**
 * A wire's path in the direction its power flows, beside the node's other lane when it has one.
 * Lanes keep apart by `wireScale` times `LANE_GAP`, so thicker wires never touch.
 */
const route = (wire: HouseWire, layout: SceneLayout, wireScale: number) => {
  const fromNode = wireRoute(wire.node, layout).map((point: Point) => project(point));
  const laned = wire.lane ? offsetLine(fromNode, (wire.lane * LANE_GAP * wireScale) / 2) : fromNode;
  return roundedPath(wire.intoInverter ? laned : reversed(laned), BEND_RADIUS);
};

/** The grid cable fades out towards the card's edge. */
const fadeOf = (wire: HouseWire) => (wire.node === "grid" ? "url(#house-grid-cable)" : nothing);

/**
 * The mask that fades the grid cable out: opaque up to GRID_FADE_FROM, transparent where it
 * leaves the card.
 */
export const gridFade = (box: Box) => {
  const [startX, startY] = project(GRID_CABLE_START);
  const [stepX, stepY] = project([
    GRID_CABLE_START[0] + 1,
    GRID_CABLE_START[1],
    GRID_CABLE_START[2],
  ]);
  const [fromX, fromY] = project(GRID_FADE_FROM);
  const [dx, dy] = [stepX - startX, stepY - startY];
  const toEdge = Math.min((box.x + box.width - startX) / dx, (box.y + box.height - startY) / dy);
  const [toX, toY] = [startX + dx * toEdge, startY + dy * toEdge];
  return svg`<defs>
    <linearGradient id="house-grid-fade" gradientUnits="userSpaceOnUse" x1=${fromX} y1=${fromY} x2=${toX} y2=${toY}>
      <stop offset="0" stop-color="#fff"></stop>
      <stop offset="1" stop-color="#fff" stop-opacity="0"></stop>
    </linearGradient>
    <mask id="house-grid-cable" maskUnits="userSpaceOnUse" x=${box.x} y=${box.y} width=${box.width} height=${box.height}>
      <rect x=${box.x} y=${box.y} width=${box.width} height=${box.height} fill="url(#house-grid-fade)"></rect>
    </mask>
  </defs>`;
};

const powerSvg = (wire: HouseWire, animate: boolean, layout: SceneLayout, wireScale: number) => {
  const d = route(wire, layout, wireScale);
  const dash = PULSE.shortest + (PULSE.longest - PULSE.shortest) * wire.intensity;
  const style = `animation-duration: ${wire.durationSeconds * PULSE_SLOWDOWN}s; stroke-dasharray: ${dash} ${PULSE.period - dash}`;
  return svg`<g class="power ${wire.node}" style=${`--wire-color: ${wire.color}`} mask=${fadeOf(wire)}>
    <path class="flow" d=${d}></path>
    ${animate ? svg`<path class="pulse" d=${d} style=${style}></path>` : nothing}
  </g>`;
};

/**
 * Every wire as a neutral track; one carrying power also gets its colour and moving pulses.
 * Wires are not part of the extent: the grid cable runs on past the card's edge.
 */
export const wiresSvg = (
  wires: HouseWire[],
  animate: boolean,
  layout: SceneLayout,
  wireScale: number
) => svg`
  ${wires.map((wire) => svg`<path class="track ${wire.node}" d=${route(wire, layout, wireScale)} mask=${fadeOf(wire)}></path>`)}
  ${wires.filter((wire) => wire.power > 0).map((wire) => powerSvg(wire, animate, layout, wireScale))}
`;

/**
 * A pulse's speed follows its wire's power, but a new animation duration alone would make the
 * pulse jump to wherever the same time falls in the new cycle. Carry its place in the cycle over
 * instead, so it only speeds up or slows down. `durations` remembers each pulse's last one.
 */
export const keepPulsePhase = (root: ParentNode, durations: WeakMap<Element, number>) => {
  root.querySelectorAll<SVGPathElement>(".pulse").forEach((pulse) => {
    const duration = Number.parseFloat(pulse.style.animationDuration) * 1000;
    const before = durations.get(pulse);
    durations.set(pulse, duration);
    const animation = ("getAnimations" in pulse ? pulse.getAnimations() : []).find(
      (running) => running instanceof CSSAnimation && running.animationName === "pulse"
    );
    const time = animation?.currentTime;
    if (!animation || !before || before === duration || typeof time !== "number") {
      return;
    }
    animation.currentTime = ((time % before) / before) * duration;
  });
};
