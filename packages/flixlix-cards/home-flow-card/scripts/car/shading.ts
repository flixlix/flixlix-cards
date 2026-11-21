import { type SampleGrid, type Samples, sampleCar } from "./raster.ts";
import { CAR, CAR_PROFILES, profileAt } from "./shape.ts";

/**
 * The car in flat illustration tones, like a key fob: a smooth body, one glass canopy over
 * windscreen, roof and rear glass, a side window with a light rail above it, and plain wheels.
 */

const normalized = (v: readonly number[]) => {
  const length = Math.hypot(...v) || 1;
  return v.map((x) => x / length);
};
const dot = (a: readonly number[], b: readonly number[]) =>
  a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0);
const VIEW = normalized([1, 1, 1]);
/** From above and the front, as on the house: front walls lighter than gables. */
const LIGHT = normalized([0.25, 0.6, 1]);
const HALFWAY = normalized(LIGHT.map((x, i) => x + (VIEW[i] ?? 0)));

export const BODY = 1;
const SIDE_WINDOW = 2;
const CANOPY = 3;

/** The side window's lower edge: rising gently towards the rear, then sweeping up into the pillar. */
const sill = (u: number) => {
  const rise = Math.min(Math.max((3.6 - u) / 2.6, 0), 1);
  const kick = Math.max(0, (1.25 - u) / 0.8) ** 2;
  return profileAt(CAR_PROFILES.belt, u) + 0.03 + 0.03 * rise ** 2 + 0.09 * kick;
};

/** The glass ends in a curve at the windscreen's and the rear glass's base, further back at the sides. */
const withinGlassEnds = (u: number, y: number) => {
  const across = Math.min(Math.abs(y) / profileAt(CAR_PROFILES.glassHalf, u), 1) ** 2.2;
  return u < CAR.roofTo - 0.07 - 0.26 * across && u > CAR.roofFrom + 0.06 + 0.2 * across;
};

const underGlass = (u: number, y: number, z: number) => {
  const belt = profileAt(CAR_PROFILES.belt, u);
  return profileAt(CAR_PROFILES.roof, u) - belt > 0.03 && z > belt + 0.03 && withinGlassEnds(u, y);
};

/** The roof's part of the canopy faces up; the side window faces out. */
const facesUp = (normal: readonly (number | undefined)[]) => {
  const [nx = 0, ny = 0, nz = 0] = normal;
  return nz / (Math.hypot(nx, ny, nz) || 1) >= 0.8;
};

const regionOf = (samples: Samples, index: number): number => {
  if (!samples.covered[index]) {
    return 0;
  }
  const [u, y, z, nx, ny, nz] = Array.from(samples.attributes.subarray(index * 6, index * 6 + 6));
  if (u === undefined || y === undefined || z === undefined) {
    return BODY;
  }
  if (!underGlass(u, y, z)) {
    return BODY;
  }
  if (facesUp([nx, ny, nz]) || y < 0) {
    return CANOPY;
  }
  return z <= sill(u) ? BODY : SIDE_WINDOW;
};

/** Whether the sample at (x, y) lies within `radius` of the other glass region: the rail. */
const onRail = (regions: Uint8Array, width: number, index: number, radius: number) => {
  const own = regions[index];
  if (own !== SIDE_WINDOW && own !== CANOPY) {
    return false;
  }
  const other = own === SIDE_WINDOW ? CANOPY : SIDE_WINDOW;
  const [x, y] = [index % width, Math.floor(index / width)];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const xx = x + dx;
      if (
        xx >= 0 &&
        xx < width &&
        dx * dx + dy * dy <= radius * radius &&
        regions[(y + dy) * width + xx] === other
      ) {
        return true;
      }
    }
  }
  return false;
};

/** Each near wheel: a circle on the body's side, seen as an ellipse. */
const onWheel = (sx: number, sy: number) =>
  CAR.wheels.some((wheel) => {
    const side =
      CAR.at[1] + (CAR.halfWidth + profileAt(CAR_PROFILES.half, wheel) * 0.96) * CAR.scale;
    const x = sx / (Math.cos(Math.PI / 6) * 10) + side;
    const z = ((x + side) * 5 - sy) / 10 / CAR.scale;
    const u = (x - CAR.at[0]) / CAR.scale;
    return z > 0 && (u - wheel) ** 2 + (z - CAR.wheelRadius) ** 2 < (CAR.wheelRadius * 1.02) ** 2;
  });

/** What the car shows at every sample of a grid over its screen box. */
export type CarSurface = {
  width: number;
  height: number;
  /** 0 where there is no car, else its paint, side window or canopy. */
  regions: Uint8Array;
  /** How lit the surface is, 0 to 1; -1 where there is no car. */
  light: Float32Array;
  /** The one crisp highlight on the paint. */
  shine: Uint8Array;
  /** The light rail between the side window and the canopy. */
  rail: Uint8Array;
  wheels: Uint8Array;
};

export const carSurface = (grid: SampleGrid): CarSurface => {
  const samples = sampleCar(grid);
  const count = grid.width * grid.height;
  const regions = Uint8Array.from({ length: count }, (_, i) => regionOf(samples, i));
  const railRadius = Math.max(1, Math.round(grid.perUnit * 0.11));
  const normalAt = (i: number) =>
    normalized(Array.from(samples.attributes.subarray(i * 6 + 3, i * 6 + 6)));
  return {
    width: grid.width,
    height: grid.height,
    regions,
    light: Float32Array.from({ length: count }, (_, i) =>
      regions[i] ? Math.max(dot(normalAt(i), LIGHT), 0) ** 1.4 : -1
    ),
    shine: Uint8Array.from({ length: count }, (_, i) =>
      regions[i] === BODY && dot(normalAt(i), HALFWAY) > 0.985 ? 1 : 0
    ),
    rail: Uint8Array.from({ length: count }, (_, i) =>
      onRail(regions, grid.width, i, railRadius) ? 1 : 0
    ),
    wheels: Uint8Array.from({ length: count }, (_, i) =>
      onWheel(
        grid.x + ((i % grid.width) + 0.5) / grid.perUnit,
        grid.y + (Math.floor(i / grid.width) + 0.5) / grid.perUnit
      )
        ? 1
        : 0
    ),
  };
};
