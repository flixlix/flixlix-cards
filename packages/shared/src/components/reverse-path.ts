type Segment = { command: "v" | "h"; length: number } | { command: "c"; values: number[] };

const arity = { v: 1, h: 1, c: 6 } as const;

const numbersIn = (text: string): number[] => (text.match(/-?\d*\.?\d+/g) ?? []).map(Number);

const isSegmentCommand = (command: string): command is keyof typeof arity => command in arity;

const unsupported = (token: string, d: string) =>
  new Error(
    `reversePath supports one absolute M followed by single relative v, h or c segments; got "${token.trim()}" in "${d}"`
  );

const parseSegment = (token: string, d: string): Segment => {
  const command = token.charAt(0);
  const values = numbersIn(token.slice(1));
  if (!isSegmentCommand(command) || values.length !== arity[command]) {
    throw unsupported(token, d);
  }
  return command === "c" ? { command, values } : { command, length: values[0] ?? 0 };
};

const deltaOf = (segment: Segment): [number, number] => {
  if (segment.command === "c") {
    return [segment.values[4] ?? 0, segment.values[5] ?? 0];
  }
  return segment.command === "v" ? [0, segment.length] : [segment.length, 0];
};

/** The same curve drawn from its end point back to its start, relative to that end point. */
const reverseSegment = (segment: Segment): string => {
  if (segment.command !== "c") {
    return `${segment.command}${-segment.length}`;
  }
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, dx = 0, dy = 0] = segment.values;
  return `c${x2 - dx},${y2 - dy} ${x1 - dx},${y1 - dy} ${-dx},${-dy}`;
};

/**
 * Reverses the drawing direction of a path like `M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20`.
 * Supports exactly the commands the flow lines use: one absolute `M`, then relative `v`, `h`, `c`.
 */
export const reversePath = (d: string): string => {
  const [move = "", ...tokens] = d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? [];
  const start = numbersIn(move.slice(1));
  if (move.charAt(0) !== "M" || start.length !== 2) {
    throw unsupported(move, d);
  }
  const segments = tokens.map((token) => parseSegment(token, d));
  const [x, y] = segments
    .map(deltaOf)
    .reduce(([px, py], [dx, dy]) => [px + dx, py + dy], [start[0] ?? 0, start[1] ?? 0]);
  // reduceRight: toReversed needs Chrome 110 and reverse mutates.
  return segments.reduceRight(
    (reversed, segment) => `${reversed} ${reverseSegment(segment)}`,
    `M${x},${y}`
  );
};
