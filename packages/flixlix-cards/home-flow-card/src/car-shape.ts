/**
 * The car parked at the house's front left: a smooth body lofted from cross-sections along its
 * length. Car space runs `u` from the tail (0) to the nose (LENGTH), `y` across from the centre
 * line (positive towards the viewer) and `z` up, in metres before CAR.scale.
 */
type Vector = readonly [number, number, number];

export const CAR = {
  /** House units per metre. */
  scale: 1.21,
  length: 4.8,
  halfWidth: 0.95,
  /** Where the glass starts and ends along the car. */
  roofFrom: 0.34,
  roofTo: 3.82,
  wheelRadius: 0.39,
  wheels: [0.86, 3.88],
  /** Its tail's corner on the ground, in house space: in front of the front wall, at its left. */
  at: [2.75, 8.9],
} as const;

/** Catmull-Rom through (u, value) knots, clamped at the ends. */
const curve = (knots: readonly (readonly [number, number])[]) => {
  const at = (i: number) => knots[Math.min(Math.max(i, 0), knots.length - 1)] ?? [0, 0];
  return (u: number): number => {
    const next = knots.findIndex(([k]) => k > u);
    if (next <= 0) {
      return at(next === 0 ? 0 : knots.length - 1)[1];
    }
    const [p0, p1, p2, p3] = [at(next - 2), at(next - 1), at(next), at(next + 1)];
    const h = p2[0] - p1[0];
    const t = (u - p1[0]) / h;
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * h;
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * h;
    return (
      (2 * t ** 3 - 3 * t ** 2 + 1) * p1[1] +
      (t ** 3 - 2 * t ** 2 + t) * m1 +
      (-2 * t ** 3 + 3 * t ** 2) * p2[1] +
      (t ** 3 - t ** 2) * m2
    );
  };
};

const bottom = curve([
  [0, 0.5],
  [0.25, 0.28],
  [0.7, 0.17],
  [4.1, 0.17],
  [4.55, 0.24],
  [4.8, 0.36],
]);
/** The shoulder: the hood at the front, the window sills and the boot. */
const belt = curve([
  [0, 0.84],
  [0.1, 0.97],
  [0.34, 1.02],
  [1.2, 1.0],
  [2.5, 0.95],
  [3.82, 0.86],
  [4.2, 0.78],
  [4.5, 0.68],
  [4.7, 0.57],
  [4.8, 0.45],
]);
/** One arc from the windscreen's base over the roof down to the boot. */
const roofArc = curve([
  [CAR.roofFrom, 1.02],
  [0.6, 1.15],
  [1.2, 1.35],
  [1.9, 1.45],
  [2.5, 1.42],
  [3.2, 1.2],
  [CAR.roofTo, 0.86],
]);
const roof = (u: number) =>
  u <= CAR.roofFrom || u >= CAR.roofTo ? belt(u) : Math.max(belt(u), roofArc(u));

/** Seen from above, the nose and the tail round off like a superellipse. */
const endRounding = (u: number) => {
  const nose = (u - (CAR.length - 0.62)) / 0.62;
  const tail = (0.42 - u) / 0.42;
  const x = Math.min(Math.max(nose, tail, 0), 1);
  return Math.max(1 - x ** 2.4, 0) ** (1 / 2.4);
};
/** The body's half-width, the fenders swelling over each wheel. */
const half = (u: number) =>
  endRounding(u) *
  (0.93 + CAR.wheels.reduce((sum, w) => sum + 0.045 * Math.exp(-(((u - w) / 0.6) ** 2)), 0));
/** The glasshouse's half-width, narrower towards the windscreen and the rear glass. */
const glassHalf = (u: number) =>
  curve([
    [CAR.roofFrom, 0.68],
    [1.2, 0.77],
    [2.6, 0.78],
    [CAR.roofTo, 0.72],
  ])(Math.min(Math.max(u, CAR.roofFrom), CAR.roofTo));

const TABLE_STEPS = 600;
const table = (profile: (u: number) => number) =>
  Float32Array.from({ length: TABLE_STEPS + 1 }, (_, i) => profile((CAR.length * i) / TABLE_STEPS));

/** The profiles, sampled along the car for quick lookups per pixel. */
export const CAR_PROFILES = {
  bottom: table(bottom),
  belt: table(belt),
  roof: table(roof),
  half: table(half),
  glassHalf: table(glassHalf),
};

/** A sampled profile at `u`, interpolated between samples. */
export const profileAt = (samples: Float32Array, u: number): number => {
  const x = Math.min(Math.max(u / CAR.length, 0), 1) * TABLE_STEPS;
  const i = Math.min(Math.floor(x), TABLE_STEPS - 1);
  const [a, b] = [samples[i] ?? 0, samples[i + 1] ?? 0];
  return a + (b - a) * (x - i);
};

/** A point of a cross-section: across (0 centre, 1 side), lower body or glasshouse, and height in it. */
type SectionPoint = readonly [across: number, part: "body" | "glass", height: number];

/** The near half of a cross-section, from the bottom's centre round to the roof's centre. */
const NEAR_HALF: readonly SectionPoint[] = [
  [0, "body", 0],
  [0.8, "body", 0],
  [0.9, "body", 0.03],
  [0.95, "body", 0.1],
  [0.985, "body", 0.22],
  [1, "body", 0.36],
  [0.995, "body", 0.5],
  [0.975, "body", 0.65],
  [0.945, "body", 0.79],
  [0.91, "body", 0.91],
  [0.875, "body", 1],
  [1, "glass", 0],
  [0.97, "glass", 0.25],
  [0.92, "glass", 0.5],
  [0.84, "glass", 0.72],
  [0.72, "glass", 0.88],
  [0.55, "glass", 0.97],
  [0.3, "glass", 1],
  [0, "glass", 1],
];
const SECTION: readonly SectionPoint[] = [
  ...NEAR_HALF,
  // the far half, back down: reduceRight, as toReversed needs Chrome 110 and reverse mutates
  ...NEAR_HALF.slice(1, -1).reduceRight<SectionPoint[]>(
    (far, [across, part, height]) => far.concat([[-across, part, height]]),
    []
  ),
];

/**
 * A section point at `u`. Where there is no glass, over the hood and the boot, the glasshouse's
 * points lie on the shoulder: a panel that dips between the front fenders.
 */
const sectionPoint = (u: number, [across, part, height]: SectionPoint): Vector => {
  if (part === "body") {
    return [u, across * half(u), bottom(u) + (belt(u) - bottom(u)) * height];
  }
  const hasGlass = roof(u) - belt(u) > 0.01;
  const width = Math.min(hasGlass ? glassHalf(u) : half(u), half(u)) * 0.875;
  const centre = 1 - Math.abs(across);
  const crown = hasGlass ? 0 : u > 2 ? -0.035 * centre ** 1.5 : 0.02 * centre;
  return [u, across * width, belt(u) + (roof(u) - belt(u)) * height + crown];
};

const sub = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vector): Vector => {
  const length = Math.hypot(...a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** Sections along the car, closer together at the rounded ends. */
const SECTIONS = 140;
const stations = Array.from(
  { length: SECTIONS + 1 },
  (_, i) => (CAR.length * (1 - Math.cos((Math.PI * i) / SECTIONS))) / 2
);

const around = (j: number) => (j + 1) % SECTION.length;

/** The normal of the quad from section `i` to `i + 1` and point `j` to the next, facing out. */
const quadNormal = (grid: readonly (readonly Vector[])[], i: number, j: number): Vector => {
  const corner = (di: number, dj: number): Vector =>
    grid[i + di]?.[dj ? around(j) : j] ?? [0, 0, 0];
  const [a, b, c, d] = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
  const n = cross(sub(c, a), sub(d, b));
  const u = stations[i] ?? 0;
  const middle: Vector = [u, 0, (bottom(u) + roof(u)) / 2];
  const away = sub(a, middle);
  return n[0] * away[0] + n[1] * away[1] + n[2] * away[2] < 0 ? [-n[0], -n[1], -n[2]] : n;
};

/** Each vertex's normal: the sum of its quads' normals, so the body shades smoothly. */
const vertexNormals = (grid: readonly (readonly Vector[])[]) => {
  const quads = grid.slice(0, -1).map((row, i) => row.map((_, j) => quadNormal(grid, i, j)));
  const quad = (i: number, j: number): Vector =>
    quads[Math.min(Math.max(i, 0), SECTIONS - 1)]?.[(j + SECTION.length) % SECTION.length] ?? [
      0, 0, 0,
    ];
  return grid.map((row, i) =>
    row.map((_, j) => {
      const sum = [quad(i - 1, j - 1), quad(i - 1, j), quad(i, j - 1), quad(i, j)].reduce<Vector>(
        (acc, n) => [acc[0] + n[0], acc[1] + n[1], acc[2] + n[2]],
        [0, 0, 0]
      );
      return normalize(sum);
    })
  );
};

const buildTriangles = (): Float32Array => {
  const grid = stations.map((u) => SECTION.map((point) => sectionPoint(u, point)));
  const normals = vertexNormals(grid);
  const triangle = (corners: readonly (readonly [number, number])[]) => [
    ...corners.flatMap(([i, j]) => grid[i]?.[j] ?? [0, 0, 0]),
    ...corners.flatMap(([i, j]) => normals[i]?.[j] ?? [0, 0, 1]),
  ];
  return Float32Array.from(
    stations.slice(0, -1).flatMap((_, i) =>
      SECTION.flatMap((__, j) =>
        triangle([
          [i, j],
          [i + 1, j],
          [i + 1, around(j)],
        ]).concat(
          triangle([
            [i, j],
            [i + 1, around(j)],
            [i, around(j)],
          ])
        )
      )
    )
  );
};

let triangles: Float32Array | undefined;

/**
 * The body as triangles, 18 numbers each: three positions in car space, then their three normals.
 * Built on first use, so a card without a car never pays for it.
 */
export const carTriangles = (): Float32Array => (triangles ??= buildTriangles());

/** Car space into house space. */
export const carToHouse = ([u, y, z]: Vector): Vector => [
  CAR.at[0] + u * CAR.scale,
  CAR.at[1] + (CAR.halfWidth + y) * CAR.scale,
  z * CAR.scale,
];

/** The car's footprint, nudged back and right like the house's own shadow. */
export const CAR_SHADOW: Vector[] = (
  [
    [0.1, -CAR.halfWidth, 0],
    [CAR.length, -CAR.halfWidth * 0.8, 0],
    [CAR.length, CAR.halfWidth * 0.8, 0],
    [0.1, CAR.halfWidth, 0],
  ] as const
).map((corner) => {
  const [x, y] = carToHouse(corner);
  return [x + 0.25, y + 0.1, 0];
});

/** Where the car's label hangs from: its near side's sill, at the tail. */
export const CAR_LABEL_AT = carToHouse([0.12, CAR.halfWidth * 0.85, 0.4]);
