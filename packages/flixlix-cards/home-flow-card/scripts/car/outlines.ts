/** A point on the sample grid, in cells. */
export type GridPoint = readonly [x: number, y: number];

/** A value per sample; an outline runs where it crosses zero, around the samples at or above. */
export type Field = (x: number, y: number) => number;

/** How far a simplified outline may stray from a point of the traced one, in cells. */
export type Tolerance = (point: GridPoint) => number;

/**
 * Closed outlines where `field` crosses zero, by marching squares: each crossing placed along
 * its grid edge by interpolation, so an outline follows the surface rather than the sample grid.
 */
export const outlines = (field: Field, width: number, height: number): GridPoint[][] => {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height ? field(x, y) : -1;
  const crossings = new Map<string, GridPoint>();
  const neighbours = new Map<string, string[]>();
  const crossing = (x1: number, y1: number, x2: number, y2: number): string => {
    const key = `${x1},${y1},${x2},${y2}`;
    if (!crossings.has(key)) {
      const [a, b] = [at(x1, y1), at(x2, y2)];
      const t = a / (a - b);
      crossings.set(key, [x1 + (x2 - x1) * t + 0.5, y1 + (y2 - y1) * t + 0.5]);
    }
    return key;
  };
  const join = (a: string, b: string) => {
    neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
    neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
  };
  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const inside = [at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)].map((v) => v >= 0);
      const edges = [
        () => crossing(x, y, x + 1, y),
        () => crossing(x + 1, y, x + 1, y + 1),
        () => crossing(x, y + 1, x + 1, y + 1),
        () => crossing(x, y, x, y + 1),
      ];
      const cut = edges.filter((_, edge) => inside[edge] !== inside[(edge + 1) % 4]);
      // a saddle cuts all four edges: join them round whichever pair of corners is inside
      const [a, b, c, d] = cut.length === 4 && inside[0] ? [cut[3], cut[0], cut[1], cut[2]] : cut;
      if (a && b) {
        join(a(), b());
      }
      if (c && d) {
        join(c(), d());
      }
    }
  }
  const visited = new Set<string>();
  const walk = (start: string): GridPoint[] => {
    const loop: GridPoint[] = [];
    let [previous, current]: [string | undefined, string | undefined] = [undefined, start];
    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      loop.push(crossings.get(current) ?? [0, 0]);
      const from: string | undefined = previous;
      previous = current;
      current = (neighbours.get(current) ?? []).find((key) => key !== from && !visited.has(key));
    }
    return loop;
  };
  return Array.from(neighbours.keys())
    .filter((key) => !visited.has(key))
    .map(walk)
    .filter((loop) => loop.length > 2);
};

export const areaOf = (loop: readonly GridPoint[]) =>
  Math.abs(
    loop.reduce((sum, [x, y], i) => {
      const [nextX, nextY] = loop[(i + 1) % loop.length] ?? [0, 0];
      return sum + x * nextY - nextX * y;
    }, 0) / 2
  );

/** Each point the average of itself and its neighbours: the last of the grid's steps, gone. */
export const smoothed = (loop: readonly GridPoint[]): GridPoint[] =>
  loop.map((point, i) => {
    const before = loop[(i + loop.length - 1) % loop.length] ?? point;
    const after = loop[(i + 1) % loop.length] ?? point;
    return [(before[0] + point[0] + after[0]) / 3, (before[1] + point[1] + after[1]) / 3];
  });

const distance = (a: GridPoint, b: GridPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Ramer-Douglas-Peucker: the fewest points of a run that keep every other within its tolerance. */
const fewest = (run: readonly GridPoint[], tolerance: Tolerance): GridPoint[] => {
  const [first, last] = [run[0], run[run.length - 1]];
  if (!first || !last || run.length < 3) {
    return [...run];
  }
  const length = distance(first, last) || 1e-9;
  const strays = run.map(
    (point) =>
      Math.abs(
        (last[0] - first[0]) * (first[1] - point[1]) - (first[0] - point[0]) * (last[1] - first[1])
      ) /
      length /
      tolerance(point)
  );
  const worst = strays.indexOf(Math.max(...strays));
  if ((strays[worst] ?? 0) <= 1) {
    return [first, last];
  }
  return [
    ...fewest(run.slice(0, worst + 1), tolerance).slice(0, -1),
    ...fewest(run.slice(worst), tolerance),
  ];
};

/** A closed outline with the fewest points that keep it within `tolerance`. */
export const simplified = (loop: readonly GridPoint[], tolerance: Tolerance): GridPoint[] => {
  const [first] = loop;
  if (!first) {
    return [];
  }
  // split at the point furthest from the first, so the loop simplifies as two open runs
  const reaches = loop.map((point) => distance(point, first));
  const far = reaches.indexOf(Math.max(...reaches));
  return [
    ...fewest(loop.slice(0, far + 1), tolerance).slice(0, -1),
    ...fewest([...loop.slice(far), first], tolerance).slice(0, -1),
  ];
};

const tenths = (value: number) => Math.round(value * 10);
const text = (inTenths: number) => String(inTenths / 10).replace(/^(-?)0\./, "$1.");

/** Closed outlines as SVG path data: to a tenth of a unit, each point relative to the last. */
export const pathData = (loops: readonly (readonly GridPoint[])[]): string =>
  loops
    .map((loop) => {
      const points = loop
        .map(([x, y]) => [tenths(x), tenths(y)] as const)
        .filter(([x, y], i, all) => {
          const before = all[(i + all.length - 1) % all.length];
          return !before || before[0] !== x || before[1] !== y;
        });
      return points.length < 3
        ? ""
        : `${points
            .map(([x, y], i) => {
              const [beforeX, beforeY] = points[i - 1] ?? [0, 0];
              const [dx, dy] = [text(x - beforeX), text(y - beforeY)];
              return i === 0 ? `M${dx} ${dy}` : `l${dx}${dy.startsWith("-") ? "" : " "}${dy}`;
            })
            .join("")}z`;
    })
    .join("");
