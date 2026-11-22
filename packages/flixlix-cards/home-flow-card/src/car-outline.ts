/**
 * The car's outlines are stored packed, a symbol or two per number, which takes a third of the
 * room of SVG path data: closed outlines of points in tenths of a screen unit, each point but
 * an outline's first as its step from the one before.
 */

/** A closed outline: points in tenths of a screen unit, none negative. */
export type Outline = readonly (readonly [x: number, y: number])[];

/** Printable ASCII from `#` on, without the backslash a string would have to escape. */
const SYMBOLS = 91;
const BACKSLASH = 92;
/** A step too long for one symbol follows this one, as a pair. */
const LONG = SYMBOLS - 1;

const symbol = (value: number) => String.fromCharCode(value + (value + 35 >= BACKSLASH ? 36 : 35));
const pair = (value: number) => symbol(Math.floor(value / SYMBOLS)) + symbol(value % SYMBOLS);
const step = (value: number) => {
  const unsigned = value >= 0 ? value * 2 : -value * 2 - 1;
  return unsigned < LONG ? symbol(unsigned) : symbol(LONG) + pair(unsigned);
};

export const packOutlines = (outlines: readonly Outline[]): string =>
  outlines
    .map(
      (points) =>
        pair(points.length) +
        points
          .map(([x, y], i) => {
            const before = points[i - 1];
            return before ? step(x - before[0]) + step(y - before[1]) : pair(x) + pair(y);
          })
          .join("")
    )
    .join("");

/** Packed outlines as SVG path data, in screen units. */
export const outlinePath = (packed: string): string => {
  let at = 0;
  const read = () => {
    const code = packed.charCodeAt(at);
    at += 1;
    return code - (code > BACKSLASH ? 36 : 35);
  };
  const readPair = () => read() * SYMBOLS + read();
  const readStep = () => {
    const first = read();
    const unsigned = first < LONG ? first : readPair();
    return (unsigned % 2 ? -(unsigned + 1) / 2 : unsigned / 2) / 10;
  };
  let path = "";
  while (at < packed.length) {
    const points = readPair();
    path += `M${readPair() / 10} ${readPair() / 10}`;
    for (let point = 1; point < points; point += 1) {
      path += `l${readStep()} ${readStep()}`;
    }
    path += "z";
  }
  return path;
};
