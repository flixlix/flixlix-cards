import { wordParts } from "./word-parts";

const DURATION = 350;
/** A steep start and a soft landing: the gap moves the moment the word changes. */
const EASE = "cubic-bezier(0.25, 1, 0.5, 1)";

const shown = new WeakMap<HTMLElement, string>();

const span = (className: string, text: string, style = "") => {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  element.style.cssText = style;
  return element;
};

/** The changing letters: their width animates, clipped sideways only. */
const SLOT_STYLE = "display: inline-block; position: relative; clip-path: inset(-0.5em 0)";
const GHOST_STYLE = "position: absolute; left: 0; top: 0";

/**
 * Shows `word` in `element`. With `animate`, only the letters that differ from the word shown
 * before change: their gap grows or shrinks so the shared letters slide, while the new letters
 * fade in over the old ones fading out. "Charging" to "Discharging" only swaps "C" for "Disc".
 */
export const morphWord = (element: HTMLElement, word: string, animate: boolean): void => {
  const before = shown.get(element);
  if (before === word) {
    return;
  }
  shown.set(element, word);
  const [head, entering, tail] = wordParts(word, before ?? "");
  const leaving = wordParts(before ?? "", word)[1];
  const slot = span("morph", "", SLOT_STYLE);
  const entered = span("enter", entering);
  const ghost = span("ghost", leaving, GHOST_STYLE);
  ghost.setAttribute("aria-hidden", "true");
  slot.append(entered, ghost);
  element.replaceChildren(head, slot, tail);
  if (!animate || before === undefined || !("animate" in slot)) {
    ghost.remove();
    return;
  }
  // ponytail: starts from the leaving letters' full width; a switch mid-morph jumps a little
  const from = ghost.getBoundingClientRect().width;
  const to = entered.getBoundingClientRect().width;
  slot.animate({ width: [`${from}px`, `${to}px`] }, { duration: DURATION, easing: EASE });
  entered.animate(
    { opacity: [0, 1], filter: ["blur(2px)", "blur(0)"] },
    { duration: DURATION, easing: "ease-out" }
  );
  // exits are shorter than entries
  ghost.animate(
    { opacity: [1, 0], filter: ["blur(0)", "blur(2px)"] },
    { duration: DURATION * 0.6, easing: "ease-out", fill: "forwards" }
  ).onfinish = () => ghost.remove();
};
