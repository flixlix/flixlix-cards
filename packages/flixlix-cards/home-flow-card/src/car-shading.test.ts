import { describe, expect, test } from "vite-plus/test";
import { type CarPalette, rasterCar, type Rgb } from "./car-shading";

const palette: CarPalette = {
  body: [250, 250, 250],
  bodyShade: [200, 200, 200],
  shine: [255, 255, 255],
  glass: [120, 0, 0],
  glassShade: [100, 0, 0],
  rail: [0, 0, 120],
  tyre: [0, 120, 0],
};

/** How many fully opaque pixels show exactly `colour`. */
const count = (pixels: Uint8ClampedArray, colour: Rgb) =>
  Array.from({ length: pixels.length / 4 }, (_, p) => p * 4).filter(
    (at) =>
      pixels[at + 3] === 255 &&
      pixels[at] === colour[0] &&
      pixels[at + 1] === colour[1] &&
      pixels[at + 2] === colour[2]
  ).length;

describe("the car's image", () => {
  const raster = rasterCar(palette, 2);
  const { pixels, pixelWidth, pixelHeight } = raster;

  test("fills the box it is placed in, transparent around the car", () => {
    expect(pixels.length).toBe(pixelWidth * pixelHeight * 4);
    expect(raster.box.width).toBeCloseTo(pixelWidth / 2);
    expect(pixels[3]).toBe(0);
    expect(pixels[pixels.length - 1]).toBe(0);
  });

  test("shows paint, a glass canopy and two wheels", () => {
    const glass = Array.from({ length: pixels.length / 4 }, (_, p) => p * 4).filter(
      (at) => pixels[at + 3] === 255 && (pixels[at + 1] ?? 0) < 10 && (pixels[at] ?? 0) >= 90
    ).length;
    expect(count(pixels, palette.tyre)).toBeGreaterThan(20);
    expect(glass).toBeGreaterThan(200);
    expect(
      Array.from({ length: pixels.length / 4 }, (_, p) => p * 4).filter(
        (at) => pixels[at + 3] === 255 && (pixels[at + 2] ?? 0) >= 200
      ).length
    ).toBeGreaterThan(glass);
  });
});
