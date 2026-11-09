const centerOf = (element: Element | null) => {
  const box = element?.getBoundingClientRect();
  if (!box) {
    throw new Error("dot to measure is not rendered");
  }
  return new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
};

/**
 * How far on screen the flow dot matching `selector` travels in one loop, walking it in small
 * steps, and how many seconds the loop takes. Pauses the dot.
 */
export const dotLoop = (
  root: ShadowRoot,
  selector: string,
  steps = 200
): { pixels: number; seconds: number } => {
  const dot = root.querySelector(selector);
  const [animation] = dot?.getAnimations() ?? [];
  if (!dot || !animation) {
    throw new Error(`${selector} is not a moving dot`);
  }
  const duration = Number(animation.effect?.getTiming().duration);
  animation.pause();
  const points = Array.from({ length: steps + 1 }, (_, step) => {
    animation.currentTime = (duration * step) / steps;
    return centerOf(dot.querySelector("circle"));
  });
  const pixels = points
    .slice(1)
    .reduce(
      (sum, point, index) =>
        sum +
        Math.hypot(
          point.x - (points[index]?.x ?? point.x),
          point.y - (points[index]?.y ?? point.y)
        ),
      0
    );
  return { pixels, seconds: duration / 1000 };
};
