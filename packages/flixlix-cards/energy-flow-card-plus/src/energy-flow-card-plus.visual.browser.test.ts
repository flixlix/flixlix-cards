import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { energyCollection, fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { flowScenarios, screenshotName } from "@flixlix-cards/shared/testing/flow-scenarios";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { EnergyFlowCardPlus } from "./energy-flow-card-plus";

const visual = flowScenarios.filter((scenario) => scenario.energy && scenario.visual);

test.for(visual)("$name", async (scenario) => {
  const growth = Object.fromEntries(
    Object.entries(scenario.states).map(([id, state]) => [id, Number(state)])
  );
  const { card } = await mountCard(
    EnergyFlowCardPlus,
    { type: "custom:energy-flow-card-plus", ...scenario.options, entities: scenario.entities },
    fakeHass({
      statistics: growth,
      energyCollection: energyCollection(new Date(2026, 0, 1), new Date(2026, 0, 1, 23, 59)),
    }),
    { width: scenario.width }
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot(screenshotName(scenario));
});
