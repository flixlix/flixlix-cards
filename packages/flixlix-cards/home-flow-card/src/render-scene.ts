import { type HouseWire, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import { chargeLevel, type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";
import {
  mdiBattery,
  mdiBatteryHigh,
  mdiBatteryLow,
  mdiBatteryMedium,
  mdiBatteryOutline,
} from "@mdi/js";
import { nothing, svg } from "lit";
import { type Extent } from "./extent";
import { wiresSvg } from "./render-wires";
import {
  DRAW_ORDER,
  faceTransform,
  fixtures,
  houseShell,
  panelSeams,
  type Point,
  project,
  type SceneGroup,
  SHADOW,
  type Shape,
} from "./scene";

/**
 * The battery's icons, by the name the card state picks: dynamic by state of charge, as in Power
 * Flow Card Plus, or the user's own. Icons outside this set are drawn as a plain battery.
 */
const BATTERY_ICONS: Record<string, string> = {
  "mdi:battery": mdiBattery,
  "mdi:battery-high": mdiBatteryHigh,
  "mdi:battery-medium": mdiBatteryMedium,
  "mdi:battery-low": mdiBatteryLow,
  "mdi:battery-outline": mdiBatteryOutline,
};

/** Fills that are gradients defined in the scene's <defs>; every other fill is a colour token. */
const GRADIENT_FILLS = ["wall", "gable", "panel", "box-front"];
const fillOf = (name: string) =>
  GRADIENT_FILLS.includes(name) ? `url(#house-${name})` : `var(--house-${name})`;

const gradient = (name: string) =>
  svg`<linearGradient id="house-${name}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style=${`stop-color: var(--house-${name}-top)`}></stop>
    <stop offset="1" style=${`stop-color: var(--house-${name})`}></stop>
  </linearGradient>`;

const DEFS = svg`<defs>
  ${GRADIENT_FILLS.map(gradient)}
  <radialGradient id="house-ground">
    <stop offset="0" style="stop-color: var(--house-ground)"></stop>
    <stop offset="0.7" style="stop-color: var(--house-ground); stop-opacity: 0.6"></stop>
    <stop offset="1" style="stop-color: var(--house-ground); stop-opacity: 0"></stop>
  </radialGradient>
  <filter id="house-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"></feGaussianBlur></filter>
</defs>`;

export type SceneInput = {
  cardState: ReadyCardState;
  wires: HouseWire[];
  /** Grows to hold everything drawn. */
  extent: Extent;
  severity: ChargeSeverity;
  /**
   * A configured generator shows only during an outage but always keeps its place, so the house
   * does not grow and shrink as the grid goes down and comes back.
   */
  reserveGenerator: boolean;
};

const batteryLook = ({ nodes }: ReadyCardState, severity: ChargeSeverity) => {
  if (!nodes.battery.has) {
    return undefined;
  }
  const soc = nodes.battery.state_of_charge.state;
  return {
    icon: BATTERY_ICONS[nodes.battery.icon] ?? mdiBattery,
    soc: typeof soc === "number" ? soc / 100 : null,
    level: typeof soc === "number" ? chargeLevel(soc, severity) : undefined,
  };
};

/** Every face of a group, in screen space, into the extent. */
const includeFaces = (extent: Extent, group: SceneGroup) =>
  group.shapes.forEach((shape) => {
    if (shape.kind === "face") {
      shape.points.forEach((point) => extent.include(project(point)));
    }
  });

/** The house, its fixtures and the wires between them, layered back to front. */
export const sceneSvg = ({ cardState, wires, extent, severity, reserveGenerator }: SceneInput) => {
  const screen = (point: Point) => {
    const projected = project(point);
    extent.include(projected);
    return projected.join(" ");
  };
  const points = (list: readonly Point[]) => list.map(screen).join(" ");
  const { nodes } = cardState;
  const hasGenerator = wires.some((wire) => wire.node === "generator");
  const parts = fixtures({
    solar: nodes.solar.has,
    generator: hasGenerator,
    battery: batteryLook(cardState, severity),
  });
  if (reserveGenerator && !hasGenerator) {
    fixtures({ solar: false, generator: true })
      .filter((part) => part.node === "generator")
      .forEach((part) => includeFaces(extent, part));
  }
  const shape = (item: Shape) =>
    item.kind === "face"
      ? svg`<polygon points=${points(item.points)} fill=${fillOf(item.fill)} stroke=${fillOf(item.fill)} stroke-width="0.4" stroke-linejoin="round"></polygon>`
      : svg`<g transform=${faceTransform(item.face, item.at)}><path d=${item.path} transform="scale(${item.size / 24}) translate(-12 -12)" fill="var(--house-icon)"></path></g>`;
  const seams = svg`<path d=${panelSeams()
    .map(([from, to]) => `M${screen(from)}L${screen(to)}`)
    .join("")} stroke="var(--house-panel-seam)" stroke-width="1"></path>`;
  const group = (part: SceneGroup) =>
    svg`<g class="node ${part.node}">${part.shapes.map(shape)}${part.node === "solar" ? seams : nothing}</g>`;
  const [groundX, groundY] = project([4, 6, 0]);
  return svg`
    ${DEFS}
    <ellipse cx=${groundX} cy=${groundY + 30} rx="260" ry="150" fill="url(#house-ground)"></ellipse>
    <polygon points=${points(SHADOW)} fill="var(--house-shadow)" filter="url(#house-blur)" opacity="0.55"></polygon>
    ${group(houseShell())}
    ${DRAW_ORDER.map((layer) =>
      "wire" in layer
        ? wiresSvg(
            wires.filter((wire) => wire.node === layer.wire),
            cardState.animate
          )
        : parts.filter((part) => part.node === layer.part).map(group)
    )}
  `;
};
