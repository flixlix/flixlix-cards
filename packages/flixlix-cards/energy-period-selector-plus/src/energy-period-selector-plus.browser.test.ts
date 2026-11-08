import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { energyCollection, fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyPeriodSelectorPlus } from "./energy-period-selector-plus";

const date = (month: number, day: number) => new Date(2024, month - 1, day);
const endOf = (month: number, day: number) => new Date(2024, month - 1, day, 23, 59, 59, 999);

const mountSelector = async (
  options: object = {},
  collection = energyCollection(date(5, 15), endOf(5, 15)),
  width?: number
) => {
  const refresh = vi.fn(collection.refresh);
  collection.refresh = refresh;
  const hass = fakeHass({ energyCollection: collection });
  const mounted = await mountCard(
    EnergyPeriodSelectorPlus,
    { type: "custom:energy-period-selector-plus", ...options },
    hass,
    { width }
  );
  return { ...mounted, collection, refresh, hass };
};

const periodOf = ({ start, end }: { start: Date; end: Date }) => ({ start, end });

const button = (root: ShadowRoot, label: string) => {
  const match = [...root.querySelectorAll("button")].find(
    (element) => (element.getAttribute("aria-label") ?? element.textContent?.trim()) === label
  );
  if (!match) {
    throw new Error(`no button "${label}"`);
  }
  return match;
};

const pressedPeriod = (root: ShadowRoot) =>
  root.querySelector('.periods [aria-pressed="true"]')?.textContent?.trim();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("energy period selector plus", () => {
  test("renders its buttons without any of HA's lazily loaded elements", async () => {
    const { root, text } = await mountSelector();

    expect(text(".label")).toBe("May 15, 2024");
    expect([...root.querySelectorAll(".periods button")].map((b) => b.textContent?.trim())).toEqual(
      ["day", "week", "month", "year"]
    );
    expect(pressedPeriod(root)).toBe("day");
    expect(button(root, "Now")).toBeTruthy();
  });

  test("picking a period sets it on HA's collection and remembers it like HA's presets", async () => {
    const { root, collection, refresh, hass } = await mountSelector();

    await userEvent.click(button(root, "month"));

    expect(periodOf(collection)).toEqual({ start: date(5, 1), end: endOf(5, 31) });
    expect(refresh).toHaveBeenCalled();
    expect(pressedPeriod(root)).toBe("month");
    expect(localStorage.getItem(`energy-default-period-_energy_${hass.panelUrl}`)).toBe(
      "this_month"
    );
  });

  test("previous and next step by the selected period", async () => {
    // English weeks start on Sunday.
    const { root, collection, text } = await mountSelector(
      {},
      energyCollection(date(5, 12), endOf(5, 18))
    );
    expect(pressedPeriod(root)).toBe("week");

    await userEvent.click(button(root, "Previous"));
    expect(periodOf(collection)).toEqual({ start: date(5, 5), end: endOf(5, 11) });
    await userEvent.click(button(root, "Next"));
    await userEvent.click(button(root, "Next"));

    expect(periodOf(collection)).toEqual({ start: date(5, 19), end: endOf(5, 25) });
    expect(text(".label")).toBe("May 19 – 25, 2024");
  });

  test("the compare button uses HA's compare modes", async () => {
    const { root, collection } = await mountSelector({ compare_button_type: "text" });
    const compare = button(root, "Compare data");

    await userEvent.click(compare);
    expect(collection.compare).toBe("previous");
    await expect.poll(() => compare.getAttribute("aria-pressed")).toBe("true");

    await userEvent.click(compare);
    expect(collection.compare).toBe("");
  });

  test("follows period changes made by other selectors", async () => {
    const { root, collection, text, settle } = await mountSelector();

    collection.setPeriod(date(1, 1), endOf(12, 31));
    await settle();

    expect(text(".label")).toBe("2024");
    expect(pressedPeriod(root)).toBe("year");
  });

  test("a range that is no calendar period shows editable dates", async () => {
    const { root, collection } = await mountSelector(
      { period_buttons: ["day", "custom"], custom_period_label: "Range" },
      energyCollection(date(5, 10), endOf(6, 8))
    );
    expect(pressedPeriod(root)).toBe("Range");
    const [start] = root.querySelectorAll("input");
    if (!start) {
      throw new Error("no date inputs");
    }

    await userEvent.fill(start, "2024-05-01");
    start.dispatchEvent(new Event("change"));

    expect(periodOf(collection)).toEqual({ start: date(5, 1), end: endOf(6, 8) });
  });

  test("fits a phone-sized card without overflowing", async () => {
    const { card } = await mountSelector(
      {
        card_background: true,
        compare_button_type: "text",
        period_buttons: ["day", "week", "month", "year", "custom"],
      },
      undefined,
      300
    );

    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
  });

  test("never creates the energy collection itself; a hidden HA date picker does", async () => {
    const hass = fakeHass();
    const created = energyCollection(date(5, 15), endOf(5, 15));
    customElements.define(
      "fake-energy-date-selection-card",
      class extends HTMLElement {
        connectedCallback() {
          Object.assign(hass.connection, { _energy: created });
        }
      }
    );
    const createCardElement = vi.fn(() =>
      document.createElement("fake-energy-date-selection-card")
    );
    vi.stubGlobal("loadCardHelpers", async () => ({ createCardElement }));

    const { text } = await mountCard(
      EnergyPeriodSelectorPlus,
      { type: "custom:energy-period-selector-plus", collection_key: "energy_custom" },
      hass
    );
    expect(text(".waiting")).toBe("Loading…");

    await expect.poll(() => text(".label"), { timeout: 3000 }).toBe("May 15, 2024");
    expect(createCardElement).toHaveBeenCalledExactlyOnceWith({
      type: "energy-date-selection",
      collection_key: "energy_custom",
    });
  });

  test("adds no hidden date picker when HA's energy cards create the collection", async () => {
    const hass = fakeHass();
    const createCardElement = vi.fn();
    vi.stubGlobal("loadCardHelpers", async () => ({ createCardElement }));
    const { text, root } = await mountCard(
      EnergyPeriodSelectorPlus,
      { type: "custom:energy-period-selector-plus" },
      hass
    );

    Object.assign(hass.connection, { _energy: energyCollection(date(5, 15), endOf(5, 15)) });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(text(".label")).toBe("May 15, 2024");
    expect(createCardElement).not.toHaveBeenCalled();
    expect(root.querySelectorAll("ha-card")).toHaveLength(0);
  });
});
