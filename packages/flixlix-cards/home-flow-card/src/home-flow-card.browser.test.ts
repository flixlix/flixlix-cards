import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  fakeHass,
  sensor,
  type StateFixtures,
  withStates,
} from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard, thawMotion } from "@flixlix-cards/shared/testing/mount-card";
import { mdiBatteryHigh, mdiBatteryLow } from "@mdi/js";
import NumberFlow from "number-flow";
import { HomeFlowCard } from "./home-flow-card";
import { type HomeFlowCardConfig } from "./types";

const allNodes: Pick<HomeFlowCardConfig, "solar" | "battery" | "grid"> = {
  solar: { entity: "sensor.solar" },
  battery: { entity: "sensor.battery", state_of_charge: "sensor.battery_soc" },
  grid: { entity: "sensor.grid" },
};

/** An evening: a little solar, the battery covering the rest of the home. */
const evening: StateFixtures = {
  "sensor.solar": "800",
  "sensor.battery": "1800",
  "sensor.grid": "0",
  "sensor.battery_soc": sensor("22", { unit: "%" }),
};

const mountHouse = (
  options: Partial<HomeFlowCardConfig> = {},
  states: StateFixtures = evening,
  width?: number
) =>
  mountCard(
    HomeFlowCard,
    { type: "custom:home-flow-card", ...allNodes, ...options },
    fakeHass({ states }),
    { width }
  );

const labelOf = (root: ShadowRoot, node: string) => {
  const label = root.querySelector<HTMLElement>(`.label.${node}`);
  if (!label) {
    throw new Error(`no ${node} label`);
  }
  return label;
};

/** What a label reads: the number-flow value (or plain number) and the rest of its text. */
const reading = (root: ShadowRoot, node: string) => {
  const number = labelOf(root, node).querySelector(".number");
  const value = number instanceof NumberFlow ? String(number.value) : number?.textContent?.trim();
  return `${value ?? "—"} ${labelOf(root, node).querySelector(".unit")?.textContent ?? ""}`.trim();
};

const startOf = (d: string) => d.match(/^M([\d.-]+ [\d.-]+)/)?.[1];
const endOf = (d: string) => d.match(/L([\d.-]+ [\d.-]+)$/)?.[1];

/** A morphing word as it reads, without the letters fading out of it. */
const wordOf = (element: Element) => {
  const copy = element.cloneNode(true);
  if (copy instanceof Element) {
    copy.querySelectorAll(".ghost").forEach((ghost) => ghost.remove());
  }
  const text = copy.textContent?.trim();
  return text === "" ? undefined : text;
};

/** The battery label's status line: its state of charge and direction, numbers as they read. */
const batteryLine = (root: ShadowRoot) => {
  const line = labelOf(root, "battery").querySelector(".status");
  const charge = line?.querySelector(".number");
  const percent =
    charge instanceof NumberFlow
      ? `${charge.value}${charge.numberSuffix ?? ""}`
      : charge?.textContent?.trim();
  const direction = line?.querySelector(".direction");
  return [percent, direction ? wordOf(direction) : undefined].filter(Boolean).join(" · ");
};

/** The path of the battery's icon for a state of charge. */
const iconOf = async (soc: string) => {
  const { root } = await mountHouse(
    {},
    { ...evening, "sensor.battery_soc": sensor(soc, { unit: "%" }) }
  );
  return root.querySelector(".node.battery g path")?.getAttribute("d");
};

/** The fill of the battery's charge bar for a state of charge. */
const barOf = async (soc: string, options: Partial<HomeFlowCardConfig> = {}) => {
  const { root } = await mountHouse(options, {
    ...evening,
    "sensor.battery_soc": sensor(soc, { unit: "%" }),
  });
  return root
    .querySelector(
      '.node.battery polygon[fill^="var(--house-soc-"]:not([fill="var(--house-soc-track)"])'
    )
    ?.getAttribute("fill");
};

/** The evening, with the grid's outage sensor on or off and a generator running. */
const outageStates = (outage: string) => ({
  ...evening,
  "binary_sensor.outage": sensor(outage, { unit: undefined }),
  "sensor.generator": "1200",
});

describe("home flow card", () => {
  test("labels every configured node with its value", async () => {
    const { root } = await mountHouse();

    expect(reading(root, "solar")).toBe("800 W");
    expect(reading(root, "home")).toBe("2.6 kW");
    expect(reading(root, "battery")).toBe("1.8 kW");
    expect(batteryLine(root)).toBe("22 % · discharging");
  });

  test("draws only what is configured", async () => {
    const { root } = await mountHouse(
      { grid: { entity: "sensor.grid" }, solar: undefined, battery: undefined },
      {
        "sensor.grid": "800",
      }
    );

    const nodes = ["solar", "home", "battery", "grid"];
    const labelled = [...root.querySelectorAll(".label")].map((label) =>
      nodes.find((node) => label.classList.contains(node))
    );
    expect(labelled).toEqual(["home"]);
    expect(root.querySelector(".track.grid")).not.toBeNull();
    expect(root.querySelector(".power.grid .pulse")).not.toBeNull();
    expect(root.querySelector(".node.solar")).toBeNull();
    expect(root.querySelector(".node.battery")).toBeNull();
  });

  test("a wire carrying power pulses; an idle one does not", async () => {
    const { root } = await mountHouse();

    expect(root.querySelector(".power.battery .pulse")).not.toBeNull();
    expect(root.querySelector(".power.grid")).toBeNull();
  });

  test("pulses run towards the inverter while discharging and away from it while charging", async () => {
    const pulseRoute = async (battery: string) => {
      const { root } = await mountHouse({}, { ...evening, "sensor.battery": battery });
      return root.querySelector(".power.battery .pulse")?.getAttribute("d") ?? "";
    };

    const discharging = await pulseRoute("1800");
    const charging = await pulseRoute("-1800");

    expect(startOf(charging)).toBe(endOf(discharging));
    expect(
      batteryLine((await mountHouse({}, { ...evening, "sensor.battery": "-1800" })).root)
    ).toBe("22 % · charging");
  });

  test("a pulse keeps its place in its cycle when its speed changes", async () => {
    const { root, card, setHass } = await mountHouse();
    // The test browser asks for reduced motion, which hides pulses; this test is about their motion.
    thawMotion(root);
    const moving = new CSSStyleSheet();
    moving.replaceSync(".pulse { display: inline !important; }");
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, moving];
    const pulse = root.querySelector(".power.battery .pulse");
    const animation = pulse?.getAnimations().find((running) => running instanceof CSSAnimation);
    const progress = () => animation?.effect?.getComputedTiming().progress;
    animation?.pause();
    const duration = Number(animation?.effect?.getComputedTiming().duration);
    if (animation) {
      animation.currentTime = duration * 0.25;
    }

    await setHass(withStates(card.hass ?? fakeHass(), { "sensor.battery": "300" }));

    expect(root.querySelector(".power.battery .pulse")).toBe(pulse);
    expect(Number(animation?.effect?.getComputedTiming().duration)).not.toBe(duration);
    expect(progress()).toBeCloseTo(0.25);
  });

  test("the battery icon follows its state of charge, as in Power Flow Card Plus", async () => {
    expect(await iconOf("90")).toBe(mdiBatteryHigh);
    expect(await iconOf("20")).toBe(mdiBatteryLow);
  });

  test("the charge bar is red below its red threshold, yellow below its yellow one, else green", async () => {
    expect(await barOf("10")).toBe("var(--house-soc-red)");
    expect(await barOf("20")).toBe("var(--house-soc-yellow)");
    expect(await barOf("80")).toBe("var(--house-soc-green)");
    const custom = {
      ...allNodes.battery,
      entity: "sensor.battery",
      state_of_charge_severity: { red: 20, yellow: 60 },
    };
    expect(await barOf("40", { battery: custom })).toBe("var(--house-soc-yellow)");
  });

  test("the direction word morphs in place when the battery switches", async () => {
    const { root, card, setHass } = await mountHouse();
    const before = labelOf(root, "battery").querySelector(".direction");

    await setHass(withStates(card.hass ?? fakeHass(), { "sensor.battery": "-900" }));

    const after = labelOf(root, "battery").querySelector(".direction");
    expect(after).toBe(before);
    expect(after ? wordOf(after) : undefined).toBe("charging");
  });

  test("an idle battery shows only its state of charge", async () => {
    const { root } = await mountHouse({}, { ...evening, "sensor.battery": "0" });

    expect(batteryLine(root)).toBe("22 %");
  });

  test("disable_dots keeps the wires still", async () => {
    const { root } = await mountHouse({ disable_dots: true });

    expect(root.querySelector(".power.battery")).not.toBeNull();
    expect(root.querySelector(".pulse")).toBeNull();
  });

  test("numbers roll to their new value when a reading changes", async () => {
    const { root, card, setHass } = await mountHouse();
    const solar = labelOf(root, "solar").querySelector(".number");
    expect(solar).toBeInstanceOf(NumberFlow);

    await setHass(withStates(card.hass ?? fakeHass(), { "sensor.solar": "950" }));

    expect(labelOf(root, "solar").querySelector(".number")).toBe(solar);
    expect(reading(root, "solar")).toBe("950 W");
  });

  test("animate_numbers: false shows plain numbers", async () => {
    const { root } = await mountHouse({ animate_numbers: false });

    expect(root.querySelector("number-flow")).toBeNull();
    expect(reading(root, "home")).toBe("2.6 kW");
  });

  test("a power outage leaves the grid cable dead", async () => {
    const { root } = await mountHouse(
      { grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } } },
      {
        ...evening,
        "sensor.grid": "800",
        "binary_sensor.outage": sensor("on", { unit: undefined }),
      }
    );

    expect(root.querySelector(".track.grid")).not.toBeNull();
    expect(root.querySelector(".power.grid")).toBeNull();
  });

  test("in an outage a generator feeds the inverter, never the grid cable", async () => {
    const { root } = await mountHouse(
      {
        grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } },
        generator: { entity: "sensor.generator" },
      },
      {
        ...evening,
        "binary_sensor.outage": sensor("on", { unit: undefined }),
        "sensor.generator": "1200",
      }
    );

    expect(root.querySelector(".node.generator")).not.toBeNull();
    expect(reading(root, "generator")).toBe("1.2 kW");
    expect(root.querySelector(".power.generator .pulse")).not.toBeNull();
    expect(root.querySelector(".power.grid")).toBeNull();
  });

  test("with the grid up the generator is hidden, keeping its place", async () => {
    const config = {
      grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } },
      generator: { entity: "sensor.generator" },
    };
    const { root, card, setHass } = await mountHouse(config, outageStates("on"));
    const viewBox = () => root.querySelector(".stage > svg")?.getAttribute("viewBox");
    const inOutage = viewBox();

    await setHass(withStates(card.hass ?? fakeHass(), outageStates("off")));

    expect(root.querySelector(".node.generator")).toBeNull();
    expect(root.querySelector(".label.generator")).toBeNull();
    expect(viewBox()).toBe(inOutage);
  });

  test("a generator needs the grid's outage sensor to know when to run", async () => {
    const { root } = await mountHouse({ generator: { entity: "sensor.generator" } });

    expect(root.querySelector(".node.generator")).toBeNull();
  });

  test("tapping a label opens its entity's more-info dialog", async () => {
    const { root, card } = await mountHouse({ clickable_entities: true });
    const opened: unknown[] = [];
    card.addEventListener("hass-more-info", (event) => {
      opened.push(event instanceof CustomEvent ? event.detail : undefined);
    });

    await userEvent.click(labelOf(root, "solar"));

    expect(opened).toEqual([{ entityId: "sensor.solar" }]);
  });

  test("labels are not buttons unless entities are clickable", async () => {
    const { root } = await mountHouse();

    expect(labelOf(root, "solar").getAttribute("role")).toBeNull();
  });

  test("follows Home Assistant's dark mode", async () => {
    const { card, setHass } = await mountHouse();
    expect(card.hasAttribute("dark")).toBe(false);

    const hass = fakeHass({ states: evening });
    await setHass({ ...hass, themes: Object.assign({}, hass.themes, { darkMode: true }) });

    expect(card.hasAttribute("dark")).toBe(true);
  });

  test("labels grow and shrink with the card", async () => {
    const { root, resize } = await mountHouse({}, evening, 600);
    const size = () => {
      const value = labelOf(root, "home").querySelector(".value");
      return value ? parseFloat(getComputedStyle(value).fontSize) : 0;
    };
    const wide = size();

    await resize(300);

    expect(size()).toBeLessThan(wide);
  });
});
