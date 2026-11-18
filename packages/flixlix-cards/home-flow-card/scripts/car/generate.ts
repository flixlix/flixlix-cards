/**
 * Traces the car's model into the outlines the card draws, so the card ships a few SVG paths
 * instead of rendering the model in the browser. Run after changing the model:
 *
 *   pnpm --filter home-flow-card generate:car
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  areaOf,
  type Field,
  type GridPoint,
  outlines,
  simplified,
  smoothed,
  type Tolerance,
} from "./outlines.ts";
import { type Outline, packOutlines } from "../../src/car-outline.ts";
import { carScreenBox, type SampleGrid } from "./raster.ts";
import { BODY, carSurface } from "./shading.ts";
import { CAR_LABEL_AT, CAR_SHADOW } from "./shape.ts";

const OUTPUT = fileURLToPath(new URL("../../src/car-paths.ts", import.meta.url));

/** Samples per screen unit. */
const PER_UNIT = 24;
/** How far a crisp outline may stray, in screen units. */
const EDGE_TOLERANCE = 0.08;
/**
 * A tone's outline matters where the light changes quickly, at a crease. Across a slow gradient
 * it may stray as far as changes the light by LIGHT_TOLERANCE, within these screen units.
 */
const LIGHT_TOLERANCE = 0.04;
const TONE_TOLERANCE = { least: 0.12, most: 1 };
/**
 * Enough tones of paint that a dark theme, where the lit and the shaded paint lie furthest
 * apart, shows no steps between them.
 */
const BODY_TONES = Array.from({ length: 16 }, (_, i) => (i + 1) / 17);
/** The glass has no creases: a few tones, softened into one another by the card. */
const GLASS_TONES = [0.25, 0.5, 0.75];
const GLASS_TOLERANCE = 0.3;
/** How far a surface's light is spread past its edge, in screen units. */
const SPREAD = 4;
/** Outlines smaller than this, in square screen units, are specks. */
const SMALLEST = { surface: 0.3, tone: 0.08, detail: 0.05 };

const box = carScreenBox();
const grid: SampleGrid = {
  x: box.x,
  y: box.y,
  perUnit: PER_UNIT,
  width: Math.ceil(box.width * PER_UNIT),
  height: Math.ceil(box.height * PER_UNIT),
};
const { width, height } = grid;
const surface = carSurface(grid);

/** Every sample without light takes the average of its lit neighbours'. */
const spreadOnce = (field: Float32Array): Float32Array =>
  field.map((value, i) => {
    if (value >= 0) {
      return value;
    }
    const [x, y] = [i % width, Math.floor(i / width)];
    const around = [
      x > 0 ? field[i - 1] : undefined,
      x < width - 1 ? field[i + 1] : undefined,
      y > 0 ? field[i - width] : undefined,
      y < height - 1 ? field[i + width] : undefined,
    ].filter((v): v is number => v !== undefined && v >= 0);
    return around.length ? around.reduce((sum, v) => sum + v, 0) / around.length : -1;
  });

/**
 * The light of the samples `own` picks, spread past their edge: a softened tone would
 * otherwise fade towards the outline it is clipped to.
 */
const spreadLight = (own: (region: number) => boolean): Float32Array =>
  Array.from({ length: SPREAD * PER_UNIT }).reduce<Float32Array>(
    spreadOnce,
    surface.light.map((value, i) => (own(surface.regions[i] ?? 0) ? value : -1))
  );

const toneTolerance =
  (light: Float32Array): Tolerance =>
  ([x, y]) => {
    const at = (dx: number, dy: number) => {
      const column = Math.min(Math.max(Math.round(x - 0.5) + dx, 0), width - 1);
      const row = Math.min(Math.max(Math.round(y - 0.5) + dy, 0), height - 1);
      return light[row * width + column] ?? -1;
    };
    const [left, right, above, below] = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)];
    if (Math.min(left, right, above, below) < 0) {
      return TONE_TOLERANCE.most * PER_UNIT;
    }
    const slope = Math.hypot(right - left, below - above) / 2;
    return Math.min(
      Math.max(LIGHT_TOLERANCE / (slope || 1e-9), TONE_TOLERANCE.least * PER_UNIT),
      TONE_TOLERANCE.most * PER_UNIT
    );
  };

const tenths = (cells: number) => Math.round((cells / PER_UNIT) * 10);

/** A traced outline in tenths of a screen unit from the car's box, without points that repeat. */
const inTenths = (loop: readonly GridPoint[]): Outline =>
  loop
    .map(([x, y]) => [tenths(x), tenths(y)] as const)
    .filter(([x, y], i, all) => {
      const before = all[(i + all.length - 1) % all.length];
      return !before || before[0] !== x || before[1] !== y;
    });

const trace = (field: Field, tolerance: Tolerance, smallest: number): string =>
  packOutlines(
    outlines(field, width, height)
      .filter((loop) => areaOf(loop) / PER_UNIT ** 2 > smallest)
      .map((loop) => inTenths(simplified(smoothed(loop), tolerance)))
      .filter((outline) => outline.length > 2)
  );

const edge: Tolerance = () => EDGE_TOLERANCE * PER_UNIT;
const where =
  (inside: (i: number) => boolean): Field =>
  (x, y) =>
    inside(y * width + x) ? 0.5 : -0.5;
const litAbove =
  (light: Float32Array, tone: number): Field =>
  (x, y) => {
    const value = light[y * width + x] ?? -1;
    return value < 0 ? -1 : value - tone;
  };

const bodyLight = spreadLight((region) => region === BODY);
const glassLight = spreadLight((region) => region > BODY);

const paths = {
  body: trace(
    where((i) => (surface.regions[i] ?? 0) > 0),
    edge,
    SMALLEST.surface
  ),
  bodyTones: BODY_TONES.map(
    (tone) =>
      [tone, trace(litAbove(bodyLight, tone), toneTolerance(bodyLight), SMALLEST.tone)] as const
  ),
  shine: trace(
    where((i) => surface.shine[i] === 1),
    edge,
    SMALLEST.detail
  ),
  glass: trace(
    where((i) => (surface.regions[i] ?? 0) > BODY),
    edge,
    SMALLEST.surface
  ),
  glassTones: GLASS_TONES.map(
    (tone) =>
      [
        tone,
        trace(litAbove(glassLight, tone), () => GLASS_TOLERANCE * PER_UNIT, SMALLEST.tone),
      ] as const
  ),
  rail: trace(
    where((i) => surface.rail[i] === 1),
    edge,
    SMALLEST.detail
  ),
  tyres: trace(
    where((i) => surface.wheels[i] === 1),
    edge,
    SMALLEST.surface
  ),
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const screenBox = {
  x: round2(box.x),
  y: round2(box.y),
  width: round2(box.width),
  height: round2(box.height),
};

await writeFile(
  OUTPUT,
  `// Generated by scripts/car/generate.ts from the car's model: do not edit by hand.

/** The car's box in the scene's screen space. */
export const CAR_BOX = ${JSON.stringify(screenBox)};

/** The car's footprint in house space, nudged back and right like the house's own shadow. */
export const CAR_SHADOW: (readonly [number, number, number])[] = ${JSON.stringify(
    CAR_SHADOW.map((point) => point.map(round2))
  )};

/** Where the car's label hangs from: its near side's sill, at the tail. */
export const CAR_LABEL_AT: readonly [number, number, number] = ${JSON.stringify(
    CAR_LABEL_AT.map(round2)
  )};

/** The share of a surface's lit colour over its shaded one, and the outline of everything lit at least that much. */
type Tone = readonly [share: number, outlines: string];

/** The car's outlines, back to front and packed: see car-outline.ts. */
export const CAR_OUTLINES: {
  body: string;
  bodyTones: readonly Tone[];
  shine: string;
  glass: string;
  glassTones: readonly Tone[];
  rail: string;
  tyres: string;
} = ${JSON.stringify(paths)};
`
);
