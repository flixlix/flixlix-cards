import { type CarPalette, rasterCar, type Rgb } from "./car-shading";

/** The car as an image for the scene: a PNG data URL and the screen box it fills. */
export type CarImage = {
  href: string;
  box: { x: number; y: number; width: number; height: number };
  /** What it was drawn for: a new state, theme or size draws it again. */
  key: string;
};

/** A computed colour, `rgb(…)` or `color(srgb …)` as browsers resolve `color-mix`, as 0–255. */
export const parseColour = (colour: string): Rgb | undefined => {
  const numbers = (colour.match(/-?[\d.]+/g) ?? []).map(Number);
  const [r, g, b] = colour.startsWith("color(") ? numbers.map((v) => v * 255) : numbers;
  return r === undefined || g === undefined || b === undefined ? undefined : [r, g, b];
};

/** How far an idle car fades towards the ground: there, but quiet. */
const IDLE_FADE = 0.55;

const fade = (palette: CarPalette, towards: Rgb): CarPalette => {
  const mix = (colour: Rgb): Rgb => [
    colour[0] + (towards[0] - colour[0]) * IDLE_FADE,
    colour[1] + (towards[1] - colour[1]) * IDLE_FADE,
    colour[2] + (towards[2] - colour[2]) * IDLE_FADE,
  ];
  return {
    body: mix(palette.body),
    bodyShade: mix(palette.bodyShade),
    shine: mix(palette.body),
    glass: mix(palette.glass),
    glassShade: mix(palette.glassShade),
    rail: mix(palette.rail),
    tyre: mix(palette.tyre),
  };
};

/** The palette, once every one of its colours has been read. */
const paletteOf = ([body, bodyShade, shine, glass, glassShade, rail, tyre]: (Rgb | undefined)[]):
  | CarPalette
  | undefined =>
  body && bodyShade && shine && glass && glassShade && rail && tyre
    ? { body, bodyShade, shine, glass, glassShade, rail, tyre }
    : undefined;

/**
 * The car's colours as the theme resolves them, read through a probe in `root`; an idle car's
 * faded towards the ground, without its highlight.
 */
export const readCarPalette = (root: ShadowRoot, idle = false): CarPalette | undefined => {
  const probe = document.createElement("span");
  root.append(probe);
  const read = (name: string) => {
    probe.style.color = `var(--house-car-${name})`;
    return parseColour(getComputedStyle(probe).color);
  };
  const [body, bodyShade, shine, glass, glassShade, rail, tyre, ground] = [
    "body",
    "body-shade",
    "shine",
    "glass",
    "glass-shade",
    "rail",
    "tyre",
    "ground",
  ].map(read);
  probe.remove();
  const palette = paletteOf([body, bodyShade, shine, glass, glassShade, rail, tyre]);
  return palette && idle && ground ? fade(palette, ground) : palette;
};

/** Pixels per screen unit: enough for the card's width on this screen, within reason. */
export const carResolution = (cardWidth: number) =>
  Math.min(
    Math.max(Math.ceil(((window.devicePixelRatio || 1) * Math.max(cardWidth, 300)) / 380), 2),
    6
  );

/** The car drawn into a PNG, or `previous` when nothing it depends on has changed. */
export const carImage = (
  palette: CarPalette,
  resolution: number,
  previous: CarImage | undefined
): CarImage | undefined => {
  const key = `${JSON.stringify(palette)}@${resolution}`;
  if (previous?.key === key) {
    return previous;
  }
  const raster = rasterCar(palette, resolution);
  const canvas = document.createElement("canvas");
  canvas.width = raster.pixelWidth;
  canvas.height = raster.pixelHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }
  context.putImageData(new ImageData(raster.pixels, raster.pixelWidth, raster.pixelHeight), 0, 0);
  return { href: canvas.toDataURL(), box: raster.box, key };
};
