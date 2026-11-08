import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { fakeHass } from "@flixlix-cards/shared/testing/fake-hass";
import { flowScenarios, screenshotName } from "@flixlix-cards/shared/testing/flow-scenarios";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { PowerFlowCardPlus } from "./power-flow-card-plus";

test.for(flowScenarios.filter((scenario) => scenario.visual))("$name", async (scenario) => {
  const { card } = await mountCard(
    PowerFlowCardPlus,
    { type: "custom:power-flow-card-plus", ...scenario.options, entities: scenario.entities },
    fakeHass({ states: scenario.states, templates: scenario.templates }),
    { width: scenario.width }
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot(screenshotName(scenario));
});
