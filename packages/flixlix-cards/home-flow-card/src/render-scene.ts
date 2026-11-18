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
import { outlinePath } from "./car-outline";
import { CAR_BOX, CAR_OUTLINES, CAR_SHADOW } from "./car-paths";
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
  type SceneLayout,
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

type Tone = readonly [share: number, path: string];
const tonePaths = (tones: readonly Tone[]): Tone[] =>
  tones.map(([share, outlines]) => [share, outlinePath(outlines)]);

/** The car's outlines as SVG path data, from the corner of its box. */
const CAR_PATHS = {
  body: outlinePath(CAR_OUTLINES.body),
  bodyTones: tonePaths(CAR_OUTLINES.bodyTones),
  shine: outlinePath(CAR_OUTLINES.shine),
  glass: outlinePath(CAR_OUTLINES.glass),
  glassTones: tonePaths(CAR_OUTLINES.glassTones),
  rail: outlinePath(CAR_OUTLINES.rail),
  tyres: outlinePath(CAR_OUTLINES.tyres),
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
  <filter id="house-car-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"></feGaussianBlur></filter>
  <filter id="house-car-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.36"></feGaussianBlur></filter>
  <filter id="house-car-glass-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"></feGaussianBlur></filter>
  <clipPath id="house-car-body"><path d=${CAR_PATHS.body}></path></clipPath>
  <clipPath id="house-car-glass"><path d=${CAR_PATHS.glass}></path></clipPath>
</defs>`;

export type SceneInput = {
  cardState: ReadyCardState;
  wires: HouseWire[];
  severity: ChargeSeverity;
  /**
   * A configured generator shows only during an outage but always keeps its place, so the house
   * does not grow and shrink as the grid goes down and comes back.
   */
  reserveGenerator: boolean;
  /** A car at home: charging or feeding the home, or parked and faded. */
  car?: "active" | "idle";
  layout: SceneLayout;
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

/** Room for the car in front of the house, kept while it is away or not yet drawn. */
export const includeCar = (extent: Extent) => {
  const box = CAR_BOX;
  extent.include([box.x, box.y]);
  extent.include([box.x + box.width, box.y + box.height]);
};

/** The car in front of the house: its box is held in the extent before its image is drawn. */
const tones = (list: readonly Tone[], colour: string) =>
  list.map(
    ([share, d]) =>
      svg`<path d=${d} style="fill: color-mix(in srgb, var(--house-car-${colour}) ${share * 100}%, var(--house-car-${colour}-shade))"></path>`
  );

/** How far an idle car fades towards the ground: there, but quiet. */
const IDLE_FADE = 0.55;

/**
 * The car in front of the house: flat outlines, each surface's tones softened into one another
 * inside its own outline. Without `color-mix` a surface shows its lit colour alone. An idle car
 * is faded towards the ground, without its highlight.
 */
const carSvg = (car: "active" | "idle") =>
  svg`<g class="node car ${car}" transform="translate(${CAR_BOX.x} ${CAR_BOX.y})">
    <path d=${CAR_PATHS.body} fill="var(--house-car-body-shade)"></path>
    <g clip-path="url(#house-car-body)"><g filter="url(#house-car-soft)" fill="var(--house-car-body)">${tones(CAR_PATHS.bodyTones, "body")}</g></g>
    ${car === "idle" ? nothing : svg`<path d=${CAR_PATHS.shine} fill="var(--house-car-shine)"></path>`}
    <path d=${CAR_PATHS.glass} fill="var(--house-car-glass-shade)"></path>
    <g clip-path="url(#house-car-glass)"><g filter="url(#house-car-glass-soft)" fill="var(--house-car-glass)">${tones(CAR_PATHS.glassTones, "glass")}</g></g>
    <path d=${CAR_PATHS.rail} fill="var(--house-car-rail)"></path>
    <path d=${CAR_PATHS.tyres} fill="var(--house-car-tyre)"></path>
    ${car === "idle" ? svg`<path d=${CAR_PATHS.body + CAR_PATHS.tyres} fill="var(--house-car-ground)" opacity=${IDLE_FADE}></path>` : nothing}
  </g>`;

/** Every face of a group, in screen space, into the extent. */
const includeFaces = (extent: Extent, group: SceneGroup) =>
  group.shapes.forEach((shape) => {
    if (shape.kind === "face") {
      shape.points.forEach((point) => extent.include(project(point)));
    }
  });

const points = (list: readonly Point[]) => list.map((point) => project(point).join(" ")).join(" ");

const shapeSvg = (item: Shape) =>
  item.kind === "face"
    ? svg`<polygon points=${points(item.points)} fill=${fillOf(item.fill)} stroke=${fillOf(item.fill)} stroke-width="0.4" stroke-linejoin="round"></polygon>`
    : svg`<g transform=${faceTransform(item.face, item.at)}><g class=${item.spin ? "spin" : nothing}><path d=${item.path} transform="scale(${item.size / 24}) translate(-12 -12)" fill="var(--house-icon)"></path></g></g>`;

const SEAMS = svg`<path d=${panelSeams()
  .map(([from, to]) => `M${project(from).join(" ")}L${project(to).join(" ")}`)
  .join("")} stroke="var(--house-panel-seam)" stroke-width="1"></path>`;

const groupSvg = (part: SceneGroup) =>
  svg`<g class="node ${part.node}">${part.shapes.map(shapeSvg)}${part.node === "solar" ? SEAMS : nothing}</g>`;

/**
 * The house, its fixtures and the wires between them. `include` makes room for all of it but the
 * wires, which run past the card's edge; `draw` layers it back to front, the wires at
 * `wireScale`, which the labels' fit decides.
 */
export const houseScene = ({
  cardState,
  wires,
  severity,
  reserveGenerator,
  car,
  layout,
}: SceneInput) => {
  const { nodes } = cardState;
  const hasGenerator = wires.some((wire) => wire.node === "generator");
  const heatPumpWire = wires.find((wire) => wire.node === "heat_pump");
  const parts = fixtures({
    solar: nodes.solar.has,
    generator: hasGenerator,
    battery: batteryLook(cardState, severity),
    // the fan turns while it draws power, unless the card's pulses are off; over a period it
    // would say it is running now
    heatPump: heatPumpWire && {
      layout,
      running: heatPumpWire.power > 0 && cardState.animate && cardState.family === "power",
    },
  });
  const include = (extent: Extent) => {
    [houseShell(), ...parts].forEach((part) => includeFaces(extent, part));
    SHADOW.forEach((point) => extent.include(project(point)));
    if (car !== undefined) {
      CAR_SHADOW.forEach((point) => extent.include(project(point)));
    }
    if (reserveGenerator && !hasGenerator) {
      fixtures({ solar: false, generator: true })
        .filter((part) => part.node === "generator")
        .forEach((part) => includeFaces(extent, part));
    }
  };
  const [groundX, groundY] = project([4, 6, 0]);
  const draw = (wireScale: number) => svg`
    ${DEFS}
    <ellipse cx=${groundX} cy=${groundY + 30} rx="260" ry="150" fill="url(#house-ground)"></ellipse>
    <polygon points=${points(SHADOW)} fill="var(--house-shadow)" filter="url(#house-blur)" opacity="0.55"></polygon>
    ${car === undefined ? nothing : svg`<polygon points=${points(CAR_SHADOW)} fill="var(--house-shadow)" filter="url(#house-car-blur)" opacity="0.9"></polygon>`}
    ${groupSvg(houseShell())}
    ${DRAW_ORDER.map((layer) =>
      "wire" in layer
        ? wiresSvg(
            wires.filter((wire) => wire.node === layer.wire),
            cardState.animate,
            layout,
            wireScale
          )
        : parts.filter((part) => part.node === layer.part).map(groupSvg)
    )}
    ${car === undefined ? nothing : carSvg(car)}
  `;
  return { include, draw };
};
