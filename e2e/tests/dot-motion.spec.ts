import { type Page } from "@playwright/test";
import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import {
  callHassService,
  cardByTitle,
  expect,
  openDashboard,
  runScript,
  test,
} from "../src/fixtures.ts";

type DotTrace = {
  frames: number;
  /** Times the dot's animation was swapped for a new one. */
  restarts: number;
  /** Frames in which the dot did not move forward along its loop. */
  stalls: number;
};

declare global {
  interface Window {
    dotTrace?: DotTrace;
    stopDotTrace?: () => void;
  }
}

const UPDATES = 12;
const UPDATE_EVERY_MS = 300;

/**
 * Sends `remaining` sensor updates, one every `UPDATE_EVERY_MS`, like several inverters reporting
 * independently. The heat pump leaves the grid dot's speed alone; the grid changes it a little.
 */
const updateReadings = async (page: Page, remaining: number): Promise<void> => {
  if (remaining === 0) {
    return;
  }
  const grid = remaining % 2 === 1;
  await callHassService("input_number", "set_value", {
    entity_id: grid ? "input_number.grid_power" : "input_number.heat_pump_power",
    value: grid ? 1500 + remaining * 10 : 800 + remaining * 10,
  });
  await page.waitForTimeout(UPDATE_EVERY_MS);
  await updateReadings(page, remaining - 1);
};

test.afterAll(async () => {
  await runScript("scenario_default");
});

// The stutter of #478 only shows in a real browser fed by a real Home Assistant: the dot's motion
// runs on Chromium's compositor, and each state update used to replace it.
test("the grid dot keeps moving forward while readings update every few hundred ms", async ({
  page,
}) => {
  await runScript("scenario_default");
  await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
  const card = cardByTitle(page, "power-flow-card-plus", "Combined entities");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('svg.flow-dot[data-path="grid"]')).toBeAttached();

  await card.evaluate((element) => {
    const trace: DotTrace = { frames: 0, restarts: 0, stalls: 0 };
    let last: { animation: Animation; progress: number } | undefined;
    let running = true;
    const sample = () => {
      if (!running) {
        return;
      }
      const dot = element.shadowRoot?.querySelector('svg.flow-dot[data-path="grid"]');
      const [animation] = dot?.getAnimations() ?? [];
      const duration = Number(animation?.effect?.getTiming().duration);
      if (animation && duration > 0) {
        const progress = (Number(animation.currentTime) % duration) / duration;
        if (last && last.animation !== animation) {
          trace.restarts += 1;
        }
        const moved = (progress - (last?.progress ?? progress) + 1) % 1;
        if (last && (moved === 0 || moved > 0.5)) {
          trace.stalls += 1;
        }
        last = { animation, progress };
        trace.frames += 1;
      }
      requestAnimationFrame(sample);
    };
    window.dotTrace = trace;
    window.stopDotTrace = () => {
      running = false;
    };
    requestAnimationFrame(sample);
  });

  await updateReadings(page, UPDATES);

  const trace = await page.evaluate(() => {
    window.stopDotTrace?.();
    return window.dotTrace;
  });
  console.warn(`grid dot over ${UPDATES} updates:`, trace);
  expect(trace?.frames).toBeGreaterThan(UPDATES * 5);
  expect(trace).toMatchObject({ restarts: 0, stalls: 0 });
});
