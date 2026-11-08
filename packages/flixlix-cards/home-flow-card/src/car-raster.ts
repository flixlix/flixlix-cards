import { carToHouse, carTriangles } from "./car-shape";
import { project, type ScreenPoint } from "./scene";

/**
 * Samples the car's body like a tiny 3D renderer: for every sample, the nearest surface's
 * position and normal in car space. An SVG of the same body would need thousands of sorted
 * polygons and still show seams between them.
 */

/** Per sample: whether the body covers it, its depth, and position and normal in car space. */
export type Samples = {
  width: number;
  height: number;
  covered: Uint8Array;
  depth: Float32Array;
  /** Six per sample: u, y, z, then the normal. */
  attributes: Float32Array;
};

/** Where the samples sit in the scene's screen space, and how many per screen unit. */
export type SampleGrid = { x: number; y: number; perUnit: number; width: number; height: number };

type Corner = { at: ScreenPoint; depth: number; offset: number };

const cornerOf = (triangles: Float32Array, offset: number, grid: SampleGrid): Corner => {
  const house = carToHouse([
    triangles[offset] ?? 0,
    triangles[offset + 1] ?? 0,
    triangles[offset + 2] ?? 0,
  ]);
  const [x, y] = project(house);
  return {
    at: [(x - grid.x) * grid.perUnit, (y - grid.y) * grid.perUnit],
    depth: house[0] + house[1] + house[2],
    offset,
  };
};

/** Twice the signed area of the triangle a, b, p. */
const edge = (a: ScreenPoint, b: ScreenPoint, p: ScreenPoint) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** Position (first three) and normal (from the ninth) of each corner, weighted. */
const ATTRIBUTE_OFFSETS = [0, 1, 2, 9, 10, 11];

const writeSample = (
  samples: Samples,
  triangles: Float32Array,
  index: number,
  corners: readonly Corner[],
  weights: readonly number[]
) => {
  const depth = corners.reduce((sum, corner, i) => sum + corner.depth * (weights[i] ?? 0), 0);
  if (samples.covered[index] && depth <= (samples.depth[index] ?? 0)) {
    return;
  }
  samples.covered[index] = 1;
  samples.depth[index] = depth;
  ATTRIBUTE_OFFSETS.forEach((offset, k) => {
    samples.attributes[index * 6 + k] = corners.reduce(
      (sum, corner, i) => sum + (weights[i] ?? 0) * (triangles[corner.offset + offset] ?? 0),
      0
    );
  });
};

/** Every sample inside one triangle, where it is nearer than what is there already. */
const fillTriangle = (samples: Samples, triangles: Float32Array, corners: readonly Corner[]) => {
  const [a, b, c] = corners.map(({ at }) => at);
  if (!a || !b || !c) {
    return;
  }
  const area = edge(a, b, c);
  if (Math.abs(area) < 1e-9) {
    return;
  }
  const xs = [a[0], b[0], c[0]];
  const ys = [a[1], b[1], c[1]];
  const left = Math.max(Math.floor(Math.min(...xs)), 0);
  const right = Math.min(Math.ceil(Math.max(...xs)), samples.width - 1);
  const top = Math.max(Math.floor(Math.min(...ys)), 0);
  const bottom = Math.min(Math.ceil(Math.max(...ys)), samples.height - 1);
  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      const p: ScreenPoint = [px + 0.5, py + 0.5];
      const weights = [edge(b, c, p) / area, edge(c, a, p) / area, edge(a, b, p) / area];
      if (weights.every((w) => w >= 0)) {
        writeSample(samples, triangles, py * samples.width + px, corners, weights);
      }
    }
  }
};

/** Samples the whole body over `grid`. */
export const sampleCar = (grid: SampleGrid): Samples => {
  const triangles = carTriangles();
  const count = grid.width * grid.height;
  const samples: Samples = {
    width: grid.width,
    height: grid.height,
    covered: new Uint8Array(count),
    depth: new Float32Array(count),
    attributes: new Float32Array(count * 6),
  };
  for (let t = 0; t < triangles.length; t += 18) {
    fillTriangle(
      samples,
      triangles,
      [0, 3, 6].map((corner) => cornerOf(triangles, t + corner, grid))
    );
  }
  return samples;
};

/** The screen box of the body, with a unit of margin all round. */
export const carScreenBox = (() => {
  let box: { x: number; y: number; width: number; height: number } | undefined;
  return () => {
    if (box) {
      return box;
    }
    const triangles = carTriangles();
    const points = Array.from({ length: triangles.length / 18 }, (_, t) =>
      project(
        carToHouse([triangles[t * 18] ?? 0, triangles[t * 18 + 1] ?? 0, triangles[t * 18 + 2] ?? 0])
      )
    );
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const x = Math.min(...xs) - 1;
    const y = Math.min(...ys) - 1;
    box = { x, y, width: Math.max(...xs) + 1 - x, height: Math.max(...ys) + 3 - y };
    return box;
  };
})();
