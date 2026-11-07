import { describe, expect, test } from "vite-plus/test";
import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { expectFlowCard, flowScenarios } from "@flixlix-cards/shared/testing/flow-scenarios";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { PowerFlowCardPlus } from "./power-flow-card-plus";

describe("power flow card scenarios", () => {
  test.for(flowScenarios)("$name", async (scenario) => {
    const card = await mountCard(
      PowerFlowCardPlus,
      { type: "custom:power-flow-card-plus", ...scenario.options, entities: scenario.entities },
      fakeHass({ states: scenario.states, templates: scenario.templates }),
      { width: scenario.width }
    );
    expectFlowCard(card, scenario.expect);
  });
});

describe("layout", () => {
  test("resizing between narrow and wide moves individuals in and out of the right slots", async () => {
    const individual = [1, 2, 3, 4].map((index) => ({ entity: `sensor.device_${index}` }));
    const card = await mountCard(
      PowerFlowCardPlus,
      {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.grid" }, individual },
      },
      fakeHass({
        states: {
          "sensor.grid": "100",
          "sensor.device_1": "1",
          "sensor.device_2": "2",
          "sensor.device_3": "3",
          "sensor.device_4": "4",
        },
      }),
      { width: 500 }
    );
    expect(card.root.querySelector(".individual-right-bottom")).not.toBeNull();

    await card.resize(340);
    expect(card.root.querySelector(".individual-right-top")).toBeNull();
    expect(card.root.querySelector(".individual-right-bottom")).toBeNull();

    await card.resize(500);
    expect(card.text("span.individual-right-top")).toBe("3 W");
    expect(card.text("span.individual-right-bottom")).toBe("4 W");
  });
});
