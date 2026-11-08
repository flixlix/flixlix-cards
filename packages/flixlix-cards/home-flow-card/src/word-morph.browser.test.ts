import { afterEach, describe, expect, test } from "vite-plus/test";
import { morphWord } from "./word-morph";

const mount = (word: string) => {
  const element = document.createElement("span");
  element.style.whiteSpace = "pre";
  document.body.append(element);
  morphWord(element, word, true);
  return element;
};

const slot = (element: HTMLElement) => element.querySelector<HTMLElement>(".morph");
const widthAt = (element: HTMLElement, progress: number) => {
  const [width] = slot(element)?.getAnimations() ?? [];
  width?.pause();
  if (width) {
    width.currentTime = 350 * progress;
  }
  return slot(element)?.getBoundingClientRect().width ?? 0;
};

afterEach(() => document.body.replaceChildren());

describe("morphWord", () => {
  test("a word shown for the first time does not animate", () => {
    const element = mount("charging");

    expect(element.textContent).toBe("charging");
    expect(element.getAnimations({ subtree: true })).toEqual([]);
  });

  test("the shared letters stay as they are; only the letters that differ change", () => {
    const element = mount("discharging");

    morphWord(element, "charging", true);

    const [head, , tail] = element.childNodes;
    expect(head?.textContent).toBe("");
    expect(tail?.textContent).toBe("charging");
    expect(element.querySelector(".enter")?.textContent).toBe("");
    expect(element.querySelector(".ghost")?.textContent).toBe("dis");
  });

  test("the gap of the letters that leave closes gradually, sliding the rest along", () => {
    const element = mount("discharging");

    morphWord(element, "charging", true);

    const dis = element.querySelector(".ghost")?.getBoundingClientRect().width ?? 0;
    expect(dis).toBeGreaterThan(1);
    expect(widthAt(element, 0)).toBeCloseTo(dis, 0);
    expect(widthAt(element, 0.5)).toBeGreaterThan(1);
    expect(widthAt(element, 0.5)).toBeLessThan(dis - 1);
    expect(widthAt(element, 1)).toBeCloseTo(0, 0);
  });

  test("the gap of the letters that arrive opens gradually", () => {
    const element = mount("charging");

    morphWord(element, "discharging", true);

    expect(widthAt(element, 0)).toBeCloseTo(0, 0);
    expect(widthAt(element, 0.5)).toBeGreaterThan(1);
    expect(element.querySelector(".enter")?.getAnimations()).toHaveLength(1);
  });

  test("a word that appears grows in from nothing", () => {
    const element = mount("");

    morphWord(element, "charging", true);

    expect(element.querySelector(".enter")?.textContent).toBe("charging");
    expect(widthAt(element, 0)).toBeCloseTo(0, 0);
  });

  test("without animation the word just changes", () => {
    const element = mount("discharging");

    morphWord(element, "charging", false);

    expect(element.textContent).toBe("charging");
    expect(element.getAnimations({ subtree: true })).toEqual([]);
  });
});
