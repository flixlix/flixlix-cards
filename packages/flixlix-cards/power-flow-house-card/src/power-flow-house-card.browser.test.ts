import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  fakeHass,
  sensor,
  type StateFixtures,
  withStates,
} from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { mdiBatteryHigh, mdiBatteryLow } from "@mdi/js";
import NumberFlow from "number-flow";
import { PowerFlowHouseCard } from "./power-flow-house-card";
import { type PowerFlowHouseCardConfig } from "./types";

const allNodes: PowerFlowHouseCardConfig["entities"] = {
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
  options: Partial<PowerFlowHouseCardConfig> = {},
  states: StateFixtures = evening,
  width?: number
) =>
  mountCard(
    PowerFlowHouseCard,
    { type: "custom:power-flow-house-card", entities: allNodes, ...options },
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

const stateOfCharge = (root: ShadowRoot) =>
  labelOf(root, "battery")
    .querySelector(".state-of-charge")
    ?.textContent?.replace(/\s+/g, " ")
    .trim();

/** The path of the battery's icon for a state of charge. */
const iconOf = async (soc: string) => {
  const { root } = await mountHouse(
    {},
    { ...evening, "sensor.battery_soc": sensor(soc, { unit: "%" }) }
  );
  return root.querySelector(".node.battery g path")?.getAttribute("d");
};

/** The fill of the battery's charge bar for a state of charge. */
const barOf = async (soc: string, options: Partial<PowerFlowHouseCardConfig> = {}) => {
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

describe("power flow house card", () => {
  test("labels every configured node with its value", async () => {
    const { root } = await mountHouse();

    expect(reading(root, "solar")).toBe("800 W");
    expect(reading(root, "home")).toBe("2.6 kW");
    expect(reading(root, "battery")).toBe("1.8 kW");
    expect(reading(root, "grid")).toBe("0 W");
    expect(stateOfCharge(root)).toBe("▼ 22 %");
  });

  test("draws only what is configured", async () => {
    const { root } = await mountHouse(
      { entities: { grid: { entity: "sensor.grid" } } },
      {
        "sensor.grid": "800",
      }
    );

    const nodes = ["solar", "home", "battery", "grid"];
    const labelled = [...root.querySelectorAll(".label")].map((label) =>
      nodes.find((node) => label.classList.contains(node))
    );
    expect(labelled).toEqual(["home", "grid"]);
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
      stateOfCharge((await mountHouse({}, { ...evening, "sensor.battery": "-1800" })).root)
    ).toBe("▲ 22 %");
  });

  test("the battery icon follows its state of charge, as in Power Flow Card Plus", async () => {
    expect(await iconOf("90")).toBe(mdiBatteryHigh);
    expect(await iconOf("20")).toBe(mdiBatteryLow);
  });

  test("the charge bar is red below its red threshold, yellow below its yellow one, else green", async () => {
    expect(await barOf("10")).toBe("var(--house-soc-red)");
    expect(await barOf("20")).toBe("var(--house-soc-yellow)");
    expect(await barOf("80")).toBe("var(--house-soc-green)");
    expect(await barOf("40", { state_of_charge_severity: { red: 20, yellow: 60 } })).toBe(
      "var(--house-soc-yellow)"
    );
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

  test("a power outage shows the grid offline", async () => {
    const { root } = await mountHouse(
      {
        entities: {
          ...allNodes,
          grid: { entity: "sensor.grid", power_outage: { entity: "binary_sensor.outage" } },
        },
      },
      { ...evening, "binary_sensor.outage": sensor("on", { unit: undefined }) }
    );

    expect(reading(root, "grid")).toBe("—");
    expect(labelOf(root, "grid").textContent).toContain("Power Outage");
  });

  test("tapping a label opens its entity's more-info dialog", async () => {
    const { root, card } = await mountHouse({ clickable_entities: true });
    const opened: unknown[] = [];
    card.addEventListener("hass-more-info", (event) => {
      opened.push(event instanceof CustomEvent ? event.detail : undefined);
    });

    await userEvent.click(labelOf(root, "grid"));

    expect(opened).toEqual([{ entityId: "sensor.grid" }]);
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
