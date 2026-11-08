import { carScreenBox, type SampleGrid, type Samples, sampleCar } from "./car-raster";
import { CAR, CAR_PROFILES, profileAt } from "./car-shape";

/**
 * The car in flat illustration tones, like a key fob: a smooth body, one glass canopy over
 * windscreen, roof and rear glass, a side window with a light rail above it, and plain wheels.
 */

export type Rgb = readonly [number, number, number];

/** The car's colours, from the card's theme. */
export type CarPalette = {
  body: Rgb;
  bodyShade: Rgb;
  shine: Rgb;
  glass: Rgb;
  glassShade: Rgb;
  rail: Rgb;
  tyre: Rgb;
};

/** The car as RGBA pixels, and the box in the scene's screen space they fill. */
export type CarRaster = {
  box: { x: number; y: number; width: number; height: number };
  pixelWidth: number;
  pixelHeight: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
};

/** Samples per pixel along each axis, for smooth edges. */
const SUPERSAMPLING = 3;

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

const BODY = 1;
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

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Lit like the house, with one crisp highlight on the paint. */
const shade = (palette: CarPalette, region: number, normal: readonly number[]): Rgb => {
  const n = normalized(normal);
  const light = Math.max(dot(n, LIGHT), 0) ** 1.4;
  if (region !== BODY) {
    return mix(palette.glassShade, palette.glass, light);
  }
  return dot(n, HALFWAY) > 0.985 ? palette.shine : mix(palette.bodyShade, palette.body, light);
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

const sampleColour = (
  palette: CarPalette,
  samples: Samples,
  regions: Uint8Array,
  grid: SampleGrid,
  index: number
): Rgb | undefined => {
  const sx = grid.x + ((index % grid.width) + 0.5) / grid.perUnit;
  const sy = grid.y + (Math.floor(index / grid.width) + 0.5) / grid.perUnit;
  if (onWheel(sx, sy)) {
    return palette.tyre;
  }
  const region = regions[index] ?? 0;
  if (region === 0) {
    return undefined;
  }
  if (onRail(regions, grid.width, index, Math.max(1, Math.round(grid.perUnit * 0.11)))) {
    return palette.rail;
  }
  return shade(
    palette,
    region,
    Array.from(samples.attributes.subarray(index * 6 + 3, index * 6 + 6))
  );
};

/** Averages each pixel's samples; uncovered samples are transparent. */
const downsample = (colourAt: (index: number) => Rgb | undefined, grid: SampleGrid) => {
  const [pixelWidth, pixelHeight] = [grid.width / SUPERSAMPLING, grid.height / SUPERSAMPLING];
  const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
  for (let p = 0; p < pixelWidth * pixelHeight; p += 1) {
    const [px, py] = [p % pixelWidth, Math.floor(p / pixelWidth)];
    const colours = Array.from({ length: SUPERSAMPLING ** 2 }, (_, s) =>
      colourAt(
        (py * SUPERSAMPLING + Math.floor(s / SUPERSAMPLING)) * grid.width +
          px * SUPERSAMPLING +
          (s % SUPERSAMPLING)
      )
    ).filter((colour): colour is Rgb => colour !== undefined);
    const sum = colours.reduce<Rgb>(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
      [0, 0, 0]
    );
    pixels.set(
      [...sum.map((v) => v / (colours.length || 1)), (255 * colours.length) / SUPERSAMPLING ** 2],
      p * 4
    );
  }
  return { pixelWidth, pixelHeight, pixels };
};

/** The car drawn at `pixelsPerUnit` pixels per screen unit of the scene. */
export const rasterCar = (palette: CarPalette, pixelsPerUnit: number): CarRaster => {
  const box = carScreenBox();
  const perUnit = pixelsPerUnit * SUPERSAMPLING;
  const grid: SampleGrid = {
    x: box.x,
    y: box.y,
    perUnit,
    width: Math.ceil(box.width * pixelsPerUnit) * SUPERSAMPLING,
    height: Math.ceil(box.height * pixelsPerUnit) * SUPERSAMPLING,
  };
  const samples = sampleCar(grid);
  const regions = Uint8Array.from({ length: grid.width * grid.height }, (_, i) =>
    regionOf(samples, i)
  );
  const image = downsample((i) => sampleColour(palette, samples, regions, grid, i), grid);
  return {
    ...image,
    box: {
      ...box,
      width: image.pixelWidth / pixelsPerUnit,
      height: image.pixelHeight / pixelsPerUnit,
    },
  };
};
