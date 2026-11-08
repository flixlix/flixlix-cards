import { afterEach, describe, expect, test } from "vite-plus/test";
import { unitSlide } from "./unit-slide";

/** A value as the card renders it: its number, then its unit right after. */
const mountValue = (value: string) => {
  const root = document.createElement("div");
  root.innerHTML = `<div class="value"><span class="number" data-value="${value}">${value}</span><span class="unit" style="display: inline-block">W</span></div>`;
  document.body.append(root);
  const number = root.querySelector<HTMLElement>(".number");
  const unit = root.querySelector<HTMLElement>(".unit");
  return {
    root,
    unit: () => unit?.getAnimations() ?? [],
    show: (next: string, fontSize = "") => {
      if (number) {
        number.dataset.value = next;
        number.textContent = next;
        number.style.fontSize = fontSize;
      }
    },
  };
};

afterEach(() => document.body.replaceChildren());

describe("unitSlide", () => {
  test("a unit slides to its place when its number changes width", () => {
    const { root, unit, show } = mountValue("80");
    const slide = unitSlide(root);

    show("2400");
    slide.slide();

    expect(unit()).toHaveLength(1);
  });

  test("a unit that moves only because the label grew stays put", () => {
    const { root, unit, show } = mountValue("80");
    const slide = unitSlide(root);

    show("80", "40px");
    slide.slide();

    expect(unit()).toHaveLength(0);
  });
});
