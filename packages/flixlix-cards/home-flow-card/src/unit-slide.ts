import NumberFlow from "number-flow";

/** Where each unit sits in its value, transforms included, so a slide in progress counts. */
const offsets = (root: ParentNode) =>
  new Map(
    [...root.querySelectorAll<HTMLElement>(".value .unit")].map((unit) => [
      unit,
      unit.getBoundingClientRect().left - (unit.parentElement?.getBoundingClientRect().left ?? 0),
    ])
  );

/**
 * A unit sits right after its number, which rolls to its new width. Recorded before a render,
 * `slide` moves each unit from where it was to its new place with the number's own timing,
 * instead of jumping there; a unit whose text changes (W to kW) slides too, without fading.
 */
export const unitSlide = (root: ParentNode) => {
  const before = offsets(root);
  return {
    slide: () => {
      root.querySelectorAll<HTMLElement>(".value .unit").forEach((unit) => {
        unit.getAnimations().forEach((running) => running.cancel());
      });
      offsets(root).forEach((after, unit) => {
        const from = before.get(unit);
        if (from === undefined || Math.abs(from - after) < 0.5 || !("animate" in unit)) {
          return;
        }
        const flow = unit.previousElementSibling;
        const timing = flow instanceof NumberFlow ? flow.transformTiming : undefined;
        unit.animate(
          { transform: [`translateX(${from - after}px)`, "none"] },
          { duration: 900, easing: "ease-out", ...timing }
        );
      });
    },
  };
};
