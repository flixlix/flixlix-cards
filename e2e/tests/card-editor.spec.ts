import { type Page } from "@playwright/test";
import { type CardType, EDITOR_DASHBOARD } from "../src/dashboards.ts";
import { expect, test } from "../src/fixtures.ts";
import { HassSocket, isObject, type JsonObject, loginWithPassword } from "../src/hass.ts";

/** A minimal valid config per card; the test edits its title through the card's own editor. */
const cardConfigs: Record<CardType, JsonObject> = {
  "power-flow-card-plus": { entities: { grid: { entity: "sensor.grid_power" } } },
  "home-flow-card": { grid: { entity: "sensor.grid_power" } },
  "energy-flow-card-plus": { entities: { grid: { entity: "sensor.grid_import_energy" } } },
  "energy-breakdown-card": { entities: [{ entity: "sensor.ev_charger_power" }] },
  "sortable-list-card": { items: [{ key: "alpha" }, { key: "beta" }] },
};

async function withSocket<T>(run: (socket: HassSocket) => Promise<T>): Promise<T> {
  const socket = await HassSocket.connect((await loginWithPassword()).access_token);
  try {
    return await run(socket);
  } finally {
    socket.close();
  }
}

const saveDashboard = (card: JsonObject) =>
  withSocket((socket) =>
    socket.call({
      type: "lovelace/config/save",
      url_path: EDITOR_DASHBOARD,
      config: { views: [{ title: "Editor", path: "editor", cards: [card] }] },
    })
  );

const savedCard = () =>
  withSocket(async (socket) => {
    const config = await socket.call({ type: "lovelace/config", url_path: EDITOR_DASHBOARD });
    const views = isObject(config) ? config.views : undefined;
    const view = Array.isArray(views) ? views[0] : undefined;
    const cards = isObject(view) ? view.cards : undefined;
    return Array.isArray(cards) ? cards[0] : undefined;
  });

for (const [type, config] of Object.entries(cardConfigs)) {
  test(`${type}: the visual editor opens and a saved change persists`, async ({ page }) => {
    await saveDashboard({ type: `custom:${type}`, title: "Before", ...config });
    await page.goto(`/${EDITOR_DASHBOARD}/editor?edit=1`);
    await expect(page.locator(`${type} ha-card`)).toBeVisible();

    await page.locator("hui-card-options").getByRole("button", { name: "Edit" }).click();
    const editor = page.locator(`${type}-editor`);
    const title = editor.getByRole("textbox", { name: "Title" });
    await expect(title).toHaveValue("Before");
    await title.fill("After");
    await page.locator("hui-dialog-edit-card").getByRole("button", { name: "Save" }).click();
    await expect(editor).toHaveCount(0);

    await expect.poll(savedCard).toMatchObject({ type: `custom:${type}`, title: "After" });
    await page.reload();
    await expect(page.locator(type).filter({ hasText: "After" })).toBeVisible();
  });
}

const openEditor = async (page: Page, type: CardType) => {
  await page.goto(`/${EDITOR_DASHBOARD}/editor?edit=1`);
  await page.locator("hui-card-options").getByRole("button", { name: "Edit" }).click();
  return page.locator(`${type}-editor`);
};

const saveCard = (page: Page) =>
  page.locator("hui-dialog-edit-card").getByRole("button", { name: "Save" }).click();

test("home-flow-card: a change saves the older option names as the generic ones", async ({
  page,
}) => {
  await saveDashboard({
    type: "custom:home-flow-card",
    title: "Before",
    grid: { entity: "sensor.grid_power" },
    battery: { entity: "sensor.battery_power", state_of_charge_position: "after_power" },
    min_expected_power: 0,
    max_expected_power: 1000,
  });
  const editor = await openEditor(page, "home-flow-card");
  await editor.getByRole("textbox", { name: "Title" }).fill("After");
  await saveCard(page);

  await expect.poll(savedCard).toEqual({
    type: "custom:home-flow-card",
    title: "After",
    grid: { entity: "sensor.grid_power" },
    battery: { entity: "sensor.battery_power", state_of_charge_position: "after_value" },
    min_expected_value: 0,
    max_expected_value: 1000,
  });
});

test("home-flow-card: in energy mode the expected range is in Wh and saves as generic", async ({
  page,
}) => {
  await saveDashboard({
    type: "custom:home-flow-card",
    mode: "energy",
    grid: { entity: "sensor.grid_import_energy" },
  });
  const editor = await openEditor(page, "home-flow-card");
  await editor.locator('link-subpage[path="advanced"]').click();
  await editor.getByText("Animation", { exact: true }).click();
  const max = editor.getByRole("spinbutton", { name: "Max Expected Value" });
  await expect(max).toBeVisible();
  await expect(editor.getByText("Default: Relative to the period's total")).toHaveCount(2);
  await max.fill("20000");
  await saveCard(page);

  await expect.poll(savedCard).toMatchObject({ mode: "energy", max_expected_value: 20000 });
});

test("power-flow-card-plus: the buttons editor adds, edits and reorders buttons", async ({
  page,
}) => {
  const type = "power-flow-card-plus";
  await saveDashboard({
    type: `custom:${type}`,
    ...cardConfigs[type],
    buttons: [{ name: "Solar", icon: "mdi:solar-power" }],
  });
  await page.goto(`/${EDITOR_DASHBOARD}/editor?edit=1`);
  await page.locator("hui-card-options").getByRole("button", { name: "Edit" }).click();
  const editor = page.locator(`${type}-editor`);
  await editor.locator('link-subpage[path="buttons"]').click();
  const buttons = editor.locator("buttons-editor");

  await buttons.locator(".add-button").click();
  await buttons.getByRole("textbox", { name: "Name" }).fill("Battery");
  await buttons.locator(".close-icon").click();
  await expect(buttons.locator(".button-label")).toHaveText(["Solar", "Battery"]);

  await buttons.locator(".handle").nth(1).dragTo(buttons.locator(".handle").nth(0));
  await expect(buttons.locator(".button-label")).toHaveText(["Battery", "Solar"]);

  await page.locator("hui-dialog-edit-card").getByRole("button", { name: "Save" }).click();
  await expect.poll(savedCard).toMatchObject({
    buttons: [
      { name: "Battery", icon: "mdi:gesture-tap-button" },
      { name: "Solar", icon: "mdi:solar-power" },
    ],
  });
  await page.goto(`/${EDITOR_DASHBOARD}/editor`);
  await expect(page.locator(`${type} .card-actions ha-button`)).toHaveText(["Battery", "Solar"]);
});
