import { describe, expect, test } from "vite-plus/test";
import { type Box } from "./extent";
import { fitLabels, LABEL_UNIT } from "./label-size";

/** A scene 300 units wide whose labels take another 60 units at their own size. */
const boxFor = (scale: number): Box => ({ x: 0, y: 0, width: 300 + 60 * scale, height: 200 });

describe("fitLabels", () => {
  test("labels grow with the scene while it is neither small nor large", () => {
    const fit = fitLabels(540, boxFor);

    expect(fit.labelUnit).toBeCloseTo(fit.sceneUnit);
  });

  test("on a narrow card labels keep their minimum, with room for it in the box", () => {
    const fit = fitLabels(420, boxFor);

    expect(fit.labelUnit).toBeCloseTo(LABEL_UNIT.min);
    expect(fit.sceneUnit).toBeLessThan(LABEL_UNIT.min);
    expect(fit.box.width).toBeCloseTo(300 + 60 * (fit.labelUnit / fit.sceneUnit), 1);
  });

  test("labels stop growing on a wide card, giving the scene the room", () => {
    const fit = fitLabels(1500, boxFor);

    expect(fit.labelUnit).toBeCloseTo(LABEL_UNIT.max);
    expect(fit.box.width).toBeLessThan(boxFor(1).width);
  });

  test("labels grow at most maxScale beyond the scene", () => {
    const fit = fitLabels(150, boxFor);

    expect(fit.labelUnit / fit.sceneUnit).toBeCloseTo(LABEL_UNIT.maxScale);
  });

  test("before the card has a width, everything is at scale", () => {
    expect(fitLabels(0, boxFor)).toEqual({ box: boxFor(1), sceneUnit: 1, labelUnit: 1 });
  });
});
