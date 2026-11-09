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

/** How thick a wire's path is on screen, in px. */
const wirePxOf = (root: ShadowRoot, selector: string) => {
  const svg = root.querySelector("svg");
  const path = root.querySelector(selector);
  if (!svg || !path) {
    return 0;
  }
  const pxPerUnit = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  // Chrome serializes a calc() stroke width as calc(2px)
  const units = /[\d.]+/.exec(getComputedStyle(path).strokeWidth)?.[0];
  return Number(units) * pxPerUnit;
};

const fontSizeOf = (root: ShadowRoot, selector: string) => {
  const element = root.querySelector(selector);
  return element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0;
};

const intersects = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

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

/** A battery's or a car's status line: its state of charge and direction, numbers as they read. */
const batteryLine = (root: ShadowRoot, node = "battery") => {
  const line = labelOf(root, node).querySelector(".status");
  const charge = line?.querySelector(".number");
  const percent =
    charge instanceof NumberFlow
      ? `${charge.value}${charge.numberSuffix ?? ""}`
      : charge?.textContent?.trim();
  const direction = line?.querySelector(".direction");
  return [percent, direction ? wordOf(direction) : undefined].filter(Boolean).join(" · ");
};

/** A label's value line as it reads: each number with its unit, in order. */
const valueLine = (root: ShadowRoot, node = "battery") =>
  [...labelOf(root, node).querySelectorAll(".value .number")]
    .map((number) => {
      const text =
        number instanceof NumberFlow
          ? `${number.value}${number.numberSuffix ?? ""}`
          : number.textContent?.trim();
      const unit = number.nextElementSibling?.classList.contains("unit")
        ? ` ${number.nextElementSibling.getAttribute("data-word")}`
        : "";
      return `${text}${unit}`;
    })
    .join(" · ");

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

/** Noon, with a car charging off the solar surplus. */
const carCharging: StateFixtures = {
  "sensor.solar": "9000",
  "sensor.battery": "0",
  "sensor.grid": "-200",
  "sensor.battery_soc": sensor("80", { unit: "%" }),
  "sensor.car_power": sensor("7.4", { unit: "kW" }),
  "sensor.car_soc": sensor("64", { unit: "%" }),
};

const car = { car: { entity: "sensor.car_power", state_of_charge: "sensor.car_soc" } };

/** Where the car's pulse starts, for a car drawing `power`. */
const carPulseStart = async (power: string) => {
  const { root } = await mountHouse(car, { ...carCharging, "sensor.car_power": power });
  return startOf(root.querySelector(".power.car .pulse")?.getAttribute("d") ?? "");
};

describe("a car", () => {
  test("charging: its power, and its state of charge without the battery's words", async () => {
    const { root } = await mountHouse(car, carCharging);

    expect(reading(root, "car")).toBe("7.4 kW");
    expect(batteryLine(root, "car")).toBe("64 %");
    expect(labelOf(root, "car").querySelector(".charging, .discharging")).toBeNull();
    expect(labelOf(root, "car").querySelector(".name")?.textContent).toBe("Car");
  });

  test("is drawn in front of the house, wired to the home's outlet", async () => {
    const { root } = await mountHouse(car, carCharging);

    expect(root.querySelector("image.car")?.getAttribute("href")).toMatch(/^data:image\/png/);
    expect(root.querySelector(".power.car .pulse")).not.toBeNull();
  });

  test("feeding the home, its power runs back to the outlet", async () => {
    const charging = await carPulseStart("7400");
    const feeding = await carPulseStart("-3000");

    expect(feeding).not.toBe(charging);
  });

  test("is drawn again for a dark theme", async () => {
    const { root, card, setHass } = await mountHouse(car, carCharging);
    const light = root.querySelector("image.car")?.getAttribute("href");

    const hass = fakeHass({ states: carCharging });
    await setHass({ ...hass, themes: Object.assign({}, hass.themes, { darkMode: true }) });

    expect(card.hasAttribute("dark")).toBe(true);
    expect(root.querySelector("image.car")?.getAttribute("href")).not.toBe(light);
  });

  test("away, it is hidden but keeps its room, so the house does not move", async () => {
    const away = {
      car: {
        ...car.car,
        visibility: [{ condition: "state" as const, entity: "device_tracker.car", state: "home" }],
      },
    };
    const atHome = await mountHouse(away, { ...carCharging, "device_tracker.car": "home" });
    const viewBox = atHome.root.querySelector("svg")?.getAttribute("viewBox");
    const { root } = await mountHouse(away, { ...carCharging, "device_tracker.car": "not_home" });

    expect(root.querySelector("image.car")).toBeNull();
    expect(root.querySelector(".label.car")).toBeNull();
    expect(root.querySelector(".track.car")).toBeNull();
    expect(root.querySelector("svg")?.getAttribute("viewBox")).toBe(viewBox);
  });

  test("idle, it is drawn faded without its cable, its charge as its value", async () => {
    const unplugged = {
      car: {
        ...car.car,
        idle: [{ condition: "state" as const, entity: "binary_sensor.cable", state: "off" }],
      },
    };
    const active = await mountHouse(unplugged, { ...carCharging, "binary_sensor.cable": "on" });
    const activeImage = active.root.querySelector("image.car")?.getAttribute("href");
    const { root } = await mountHouse(unplugged, { ...carCharging, "binary_sensor.cable": "off" });

    expect(root.querySelector("image.car")?.getAttribute("href")).not.toBe(activeImage);
    expect(root.querySelector(".track.car")).toBeNull();
    expect(reading(root, "car")).toBe("64 %");
    expect(labelOf(root, "car").querySelector(".status")).toBeNull();
  });

  test("without idle conditions, it is idle while it draws no power", async () => {
    const { root } = await mountHouse(car, { ...carCharging, "sensor.car_power": "0" });

    expect(root.querySelector(".track.car")).toBeNull();
    expect(reading(root, "car")).toBe("64 %");
  });

  test("leaves the house exactly where it is without a car", async () => {
    const plain = await mountHouse({}, carCharging);
    const { root } = await mountHouse(car, carCharging);

    expect(root.querySelector("svg")?.getAttribute("viewBox")).toBe(
      plain.root.querySelector("svg")?.getAttribute("viewBox")
    );
  });

  test("without its entity it is ignored, as when cleared in the editor", async () => {
    const plain = await mountHouse({}, carCharging);
    const { root } = await mountHouse(
      { car: { entity: "", state_of_charge: "sensor.car_soc" } },
      carCharging
    );

    expect(root.querySelector(".label.car")).toBeNull();
    expect(root.querySelector("svg")?.getAttribute("viewBox")).toBe(
      plain.root.querySelector("svg")?.getAttribute("viewBox")
    );
  });

  test("is not drawn without one", async () => {
    const { root } = await mountHouse({}, carCharging);

    expect(root.querySelector("image.car")).toBeNull();
    expect(root.querySelector(".label.car")).toBeNull();
  });
});

describe("home flow card", () => {
  test("labels every configured node with its value", async () => {
    const { root } = await mountHouse();

    expect(reading(root, "solar")).toBe("800 W");
    expect(reading(root, "home")).toBe("2.6 kW");
    expect(reading(root, "grid")).toBe("0 W");
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
    expect(labelled).toEqual(["home", "grid"]);
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

  test("labels follow the card's width after it is taken out and put back", async () => {
    // Home Assistant moves cards around while a dashboard loads
    const { root, card, resize } = await mountHouse();
    const size = () => fontSizeOf(root, ".label.home .value");
    const atFull = size();
    const container = card.parentElement;
    card.remove();
    container?.append(card);
    await card.updateComplete;

    await resize(900);

    expect(size()).toBeGreaterThan(atFull * 1.2);
  });

  test("a pulse keeps its place in its cycle when its speed changes", async () => {
    const { root, card } = await mountHouse();
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

    // updated directly: the harness's setHass rewinds every animation once the card settles
    card.hass = withStates(card.hass ?? fakeHass(), { "sensor.battery": "300" });
    await card.updateComplete;

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

  test.each([
    [undefined, "1.8 kW", "22 % · discharging"],
    ["below_power", "1.8 kW", "22 % · discharging"],
    ["above_power", "22 %", "1.8 kW · discharging"],
    ["after_power", "1.8 kW · 22 %", "discharging"],
    ["before_power", "22 % · 1.8 kW", "discharging"],
  ] as const)("state_of_charge_position %s: %s, then %s", async (position, value, status) => {
    const { root } = await mountHouse({
      battery: {
        ...allNodes.battery,
        entity: "sensor.battery",
        state_of_charge_position: position,
      },
    });

    expect(valueLine(root)).toBe(value);
    expect(batteryLine(root)).toBe(status);
  });

  test("an idle battery with its state of charge beside its power has no status line", async () => {
    const { root } = await mountHouse(
      {
        battery: {
          ...allNodes.battery,
          entity: "sensor.battery",
          state_of_charge_position: "after_power",
        },
      },
      { ...evening, "sensor.battery": "0" }
    );

    expect(valueLine(root)).toBe("0 W · 22 %");
    expect(labelOf(root, "battery").querySelector(".status")).toBeNull();
  });

  test("without a state of charge, every position shows the power as its value", async () => {
    const { root } = await mountHouse({
      battery: { entity: "sensor.battery", state_of_charge_position: "above_power" },
    });

    expect(valueLine(root)).toBe("1.8 kW");
    expect(batteryLine(root)).toBe("discharging");
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
    expect(reading(root, "grid")).toBe("—");
    expect(labelOf(root, "grid").querySelector(".outage")?.textContent).toBe("Power Outage");
  });

  test("the card keeps its size as the grid goes down and comes back", async () => {
    // grid only: nothing but the house and the grid's own label sets the card's size
    const { root, card, setHass } = await mountHouse(
      {
        grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } },
        solar: undefined,
        battery: undefined,
      },
      outageStates("off")
    );
    const viewBox = () => root.querySelector(".stage > svg")?.getAttribute("viewBox");
    const gridUp = viewBox();

    await setHass(withStates(card.hass ?? fakeHass(), outageStates("on")));

    expect(labelOf(root, "grid").querySelector(".outage")).not.toBeNull();
    expect(viewBox()).toBe(gridUp);
  });

  test("the outage alert is the grid's label_alert when it has one", async () => {
    const { root } = await mountHouse(
      {
        grid: {
          entity: "sensor.grid",
          power_outage: { entity: "binary_sensor.outage", label_alert: "Blackout" },
        },
      },
      { ...evening, "binary_sensor.outage": sensor("on", { unit: undefined }) }
    );

    expect(labelOf(root, "grid").querySelector(".outage")?.textContent).toBe("Blackout");
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
    // the generator's label takes the grid's place
    expect(root.querySelector(".label.grid")).toBeNull();
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
    expect(root.querySelector(".label.grid")).not.toBeNull();
    expect(viewBox()).toBe(inOutage);
  });

  test("a generator needs the grid's outage sensor to know when to run", async () => {
    const { root } = await mountHouse({ generator: { entity: "sensor.generator" } });

    expect(root.querySelector(".node.generator")).toBeNull();
  });

  test("tapping a label opens its entity's more-info dialog", async () => {
    const { root, card } = await mountHouse();
    const opened: unknown[] = [];
    card.addEventListener("hass-more-info", (event) => {
      opened.push(event instanceof CustomEvent ? event.detail : undefined);
    });

    await userEvent.click(labelOf(root, "solar"));

    expect(opened).toEqual([{ entityId: "sensor.solar" }]);
  });

  test("labels are not buttons with clickable_entities: false", async () => {
    const { root } = await mountHouse({ clickable_entities: false });

    expect(labelOf(root, "solar").getAttribute("role")).toBeNull();
  });

  test("follows Home Assistant's dark mode", async () => {
    const { card, setHass } = await mountHouse();
    expect(card.hasAttribute("dark")).toBe(false);

    const hass = fakeHass({ states: evening });
    await setHass({ ...hass, themes: Object.assign({}, hass.themes, { darkMode: true }) });

    expect(card.hasAttribute("dark")).toBe(true);
  });

  test("label text stays readable on a narrow card and stops growing on a wide one", async () => {
    const narrow = await mountHouse({}, evening, 330);
    expect(fontSizeOf(narrow.root, ".label.home .name")).toBeGreaterThanOrEqual(12);
    expect(fontSizeOf(narrow.root, ".label.battery .status")).toBeGreaterThanOrEqual(12);
    expect(fontSizeOf(narrow.root, ".label.home .value")).toBeGreaterThanOrEqual(21);

    const wide = await mountHouse({}, evening, 1300);
    expect(fontSizeOf(wide.root, ".label.home .value")).toBeLessThanOrEqual(34);
    expect(fontSizeOf(wide.root, ".label.home .name")).toBeLessThanOrEqual(19);
  });

  test.each([250, 300, 360, 430, 600, 900, 1300])(
    "at %ipx every label stays inside the card, clear of the others",
    async (width) => {
      const { root } = await mountHouse(
        {
          battery: {
            ...allNodes.battery,
            entity: "sensor.battery",
            state_of_charge_position: "after_power",
          },
          ...car,
        },
        carCharging,
        width
      );
      const stage = root.querySelector(".stage")?.getBoundingClientRect();
      const labels = [...root.querySelectorAll(".label")].map((label) => ({
        node: label.className,
        box: label.getBoundingClientRect(),
      }));
      expect(labels.length).toBe(5);
      labels.forEach(({ node, box }) => {
        expect({
          node,
          inside:
            stage !== undefined &&
            box.left >= stage.left - 0.5 &&
            box.right <= stage.right + 0.5 &&
            box.top >= stage.top - 0.5 &&
            box.bottom <= stage.bottom + 0.5,
        }).toEqual({ node, inside: true });
      });
      labels.forEach((a, i) =>
        labels.slice(i + 1).forEach((b) => {
          expect({ pair: [a.node, b.node], overlap: intersects(a.box, b.box) }).toEqual({
            pair: [a.node, b.node],
            overlap: false,
          });
        })
      );
    }
  );

  test("wires stay about as thick on a narrow card as on a wide one", async () => {
    const narrow = wirePxOf((await mountHouse({}, evening, 330)).root, ".battery .flow");
    const wide = wirePxOf((await mountHouse({}, evening, 1300)).root, ".battery .flow");

    expect(narrow).toBeGreaterThanOrEqual(1.5);
    expect(wide).toBeLessThanOrEqual(2.4 + 0.01);
    expect(wide / narrow).toBeLessThan(1.6);
  });

  test("wire_width draws every wire that many times thicker", async () => {
    const wires = [".track.battery", ".battery .flow", ".battery .pulse"];
    const measure = async (options: Partial<HomeFlowCardConfig>) => {
      const { root } = await mountHouse(options, evening, 600);
      return wires.map((selector) => wirePxOf(root, selector));
    };
    const thin = await measure({});
    const thick = await measure({ wire_width: 2 });

    thick.forEach((px, i) => expect(px / (thin[i] ?? 0)).toBeCloseTo(2, 1));
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
