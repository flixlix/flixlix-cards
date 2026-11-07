import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { entityState, readToken } from "../src/hass.ts";
import { callHassService, cardByTitle, expect, openDashboard, test } from "../src/fixtures.ts";

const ORDER = "input_text.device_priority";

test("moving a row down saves the new order through the configured service", async ({ page }) => {
  await callHassService("input_text", "set_value", {
    entity_id: ORDER,
    value: "ev_charger,heat_pump,washing_machine,dryer",
  });
  await openDashboard(page, CARD_DASHBOARDS["sortable-list-card"]);
  const card = cardByTitle(page, "sortable-list-card", "Device priority");
  const names = card.locator(".name");
  await expect(names).toHaveText(["EV charger", "Heat pump", "Washing machine", "Dryer"]);

  await card.locator(".down").first().click();

  await expect(names).toHaveText(["Heat pump", "EV charger", "Washing machine", "Dryer"]);
  const token = await readToken();
  await expect
    .poll(() => entityState(token, ORDER))
    .toBe("heat_pump,ev_charger,washing_machine,dryer");
});
