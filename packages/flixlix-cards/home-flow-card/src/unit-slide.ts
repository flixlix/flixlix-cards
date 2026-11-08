import NumberFlow from "number-flow";

/** The number a unit follows, as its value attribute holds it. */
const valueOf = (unit: HTMLElement) =>
  unit.previousElementSibling instanceof HTMLElement
    ? unit.previousElementSibling.dataset.value
    : undefined;

/**
 * Where each unit sits in its value, transforms included, so a slide in progress counts, and the
 * number it follows.
 */
const offsets = (root: ParentNode) =>
  new Map(
    [...root.querySelectorAll<HTMLElement>(".value .unit")].map((unit) => [
      unit,
      {
        left:
          unit.getBoundingClientRect().left -
          (unit.parentElement?.getBoundingClientRect().left ?? 0),
        value: valueOf(unit),
      },
    ])
  );

/**
 * A unit sits right after its number, which rolls to its new width. Recorded before a render,
 * `slide` moves each unit from where it was to its new place with the number's own timing,
 * instead of jumping there; a unit whose text changes (W to kW) slides too, without fading.
 * Only a new number moves a unit: one that moves because the label grew, or its first number came
 * in, just stands at its new place.
 */
export const unitSlide = (root: ParentNode) => {
  const before = offsets(root);
  return {
    slide: () => {
      root.querySelectorAll<HTMLElement>(".value .unit").forEach((unit) => {
        unit.getAnimations().forEach((running) => running.cancel());
      });
      offsets(root).forEach(({ left: after, value }, unit) => {
        const previous = before.get(unit);
        const from = previous?.left;
        if (
          from === undefined ||
          previous?.value === undefined ||
          previous.value === value ||
          Math.abs(from - after) < 0.5 ||
          !("animate" in unit)
        ) {
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
