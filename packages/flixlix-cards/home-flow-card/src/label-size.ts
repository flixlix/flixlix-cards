import { type Box } from "./extent";

/**
 * The px per label unit the labels' text keeps to: names and the status line between 12 and
 * 19 px, values between about 21 and 34 px; in between, labels grow with the scene. `maxScale`
 * bounds how much larger than the scene a label may get: past it, neighbouring labels (the car's
 * and the home's first) run into each other, so the narrowest cards fall short of `min`.
 */
export const LABEL_UNIT = { min: 12 / 9.5, max: 2, maxScale: 1.75 } as const;

/** The scene's px per screen unit, and the labels' own, which `LABEL_UNIT` bounds. */
export type LabelFit = { box: Box; sceneUnit: number; labelUnit: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * The viewBox for a card `width` px wide, with room for labels at their bounded size. A label
 * larger than the scene's scale takes more of the viewBox, which shrinks the scene, which makes
 * the label larger still against it: a few rounds settle it, as the labels take only part of the
 * card. `boxFor` gives the viewBox for labels at a scale against the scene.
 */
export const fitLabels = (width: number, boxFor: (scale: number) => Box): LabelFit => {
  if (width <= 0) {
    return { box: boxFor(1), sceneUnit: 1, labelUnit: 1 };
  }
  let scale = 1;
  let box = boxFor(scale);
  for (let round = 0; round < 8; round += 1) {
    const sceneUnit = width / box.width;
    const next = Math.min(
      clamp(sceneUnit, LABEL_UNIT.min, LABEL_UNIT.max) / sceneUnit,
      LABEL_UNIT.maxScale
    );
    if (Math.abs(next - scale) < 0.001) {
      break;
    }
    scale = next;
    box = boxFor(scale);
  }
  const sceneUnit = width / box.width;
  return {
    box,
    sceneUnit,
    labelUnit: Math.min(
      clamp(sceneUnit, LABEL_UNIT.min, LABEL_UNIT.max),
      sceneUnit * LABEL_UNIT.maxScale
    ),
  };
};

/**
 * How many times thicker than the scene's own scale the wires are drawn, for `width` times their
 * default thickness. Wires keep to the labels' px per unit, so like the text they stay visible on
 * a narrow card and stop thickening on a wide one. A width that is not a positive number is 1.
 */
export const wireScale = ({ sceneUnit, labelUnit }: LabelFit, width?: number) =>
  (labelUnit / sceneUnit) * (typeof width === "number" && width > 0 ? width : 1);
