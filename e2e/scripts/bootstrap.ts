/**
 * Turns a fresh (or already set up) dev Home Assistant into a ready instance: onboarding,
 * a long-lived token for scripts and tests, energy preferences, imported energy history,
 * the storage dashboard the editor tests write to, and the default scenario.
 * Safe to re-run. Usage: `pnpm hass:bootstrap` (part of `pnpm hass:up`).
 */
import { ENERGY_METERS, hourlyRows } from "../src/energy-history.ts";
import {
  type AuthTokens,
  callService,
  CLIENT_ID,
  DEV_USER,
  exchangeAuthCode,
  getJson,
  HASS_URL,
  HassSocket,
  isObject,
  type JsonObject,
  loginWithPassword,
  postJson,
  readToken,
  TOKEN_FILE,
  waitForHttp,
  waitForRunning,
  writeToken,
} from "../src/hass.ts";
import {
  EDITOR_DASHBOARD,
  HOUSE_EDITOR_DASHBOARD,
  PERIOD_EDITOR_DASHBOARD,
} from "../src/dashboards.ts";

type OnboardingStep = "user" | "core_config" | "analytics" | "integration";

/** Once onboarding is complete Home Assistant stops serving its API. */
async function pendingOnboardingSteps(): Promise<Set<string>> {
  const response = await fetch(`${HASS_URL}/api/onboarding`);
  if (response.status === 404) {
    return new Set();
  }
  const steps: unknown = await response.json();
  if (!Array.isArray(steps)) {
    throw new Error(`Unexpected onboarding status: ${JSON.stringify(steps)}`);
  }
  return new Set(
    steps.flatMap((step) =>
      isObject(step) && step.done === false && typeof step.step === "string" ? [step.step] : []
    )
  );
}

async function createOwner(): Promise<AuthTokens> {
  const result = await postJson("/api/onboarding/users", {
    client_id: CLIENT_ID,
    name: DEV_USER.name,
    username: DEV_USER.username,
    password: DEV_USER.password,
    language: "en",
  });
  if (!isObject(result) || typeof result.auth_code !== "string") {
    throw new Error(`Onboarding did not return an auth code: ${JSON.stringify(result)}`);
  }
  return exchangeAuthCode(result.auth_code);
}

const remainingSteps: Record<Exclude<OnboardingStep, "user">, Record<string, string>> = {
  core_config: {},
  analytics: {},
  integration: { client_id: CLIENT_ID, redirect_uri: CLIENT_ID },
};

async function onboard(): Promise<AuthTokens> {
  const pending = await pendingOnboardingSteps();
  const tokens = pending.has("user") ? await createOwner() : await loginWithPassword();
  // One step at a time, as the frontend does: each completed step notifies listeners.
  await Object.entries(remainingSteps)
    .filter(([step]) => pending.has(step))
    .reduce(
      (previous, [step, body]) =>
        previous.then(() => postJson(`/api/onboarding/${step}`, body, tokens.access_token)),
      Promise.resolve<unknown>(null)
    );
  console.warn(pending.size ? `Onboarded: ${[...pending].join(", ")}` : "Already onboarded");
  return tokens;
}

async function tokenStillValid(): Promise<boolean> {
  try {
    await getJson("/api/", await readToken());
    return true;
  } catch {
    return false;
  }
}

async function ensureLongLivedToken(socket: HassSocket): Promise<void> {
  if (await tokenStillValid()) {
    return;
  }
  const token = await socket.call({
    type: "auth/long_lived_access_token",
    client_name: `flixlix-cards e2e ${new Date().toISOString()}`,
    lifespan: 3650,
  });
  if (typeof token !== "string") {
    throw new Error(`Unexpected long-lived token response: ${JSON.stringify(token)}`);
  }
  await writeToken(token);
  console.warn(`Wrote a long-lived token to ${TOKEN_FILE}`);
}

const saveEnergyPrefs = (socket: HassSocket) =>
  socket.call({
    type: "energy/save_prefs",
    energy_sources: [
      {
        type: "grid",
        stat_energy_from: "sensor.grid_import_energy",
        stat_energy_to: "sensor.grid_export_energy",
        stat_rate: "sensor.grid_power",
        cost_adjustment_day: 0,
      },
      { type: "solar", stat_energy_from: "sensor.solar_energy", stat_rate: "sensor.solar_power" },
      {
        type: "battery",
        stat_energy_from: "sensor.battery_discharge_energy",
        stat_energy_to: "sensor.battery_charge_energy",
        stat_rate: "sensor.battery_power",
      },
    ],
    device_consumption: [
      { stat_consumption: "sensor.ev_charger_energy", stat_rate: "sensor.ev_charger_power" },
      { stat_consumption: "sensor.heat_pump_energy", stat_rate: "sensor.heat_pump_power" },
      {
        stat_consumption: "sensor.washing_machine_energy",
        stat_rate: "sensor.washing_machine_power",
      },
    ],
  });

async function importEnergyHistory(socket: HassSocket): Promise<void> {
  const now = new Date();
  await Promise.all(
    ENERGY_METERS.map(({ id, name }) =>
      socket.call({
        type: "recorder/import_statistics",
        metadata: {
          statistic_id: id,
          source: "recorder",
          name,
          unit_of_measurement: "kWh",
          unit_class: "energy",
          has_sum: true,
          mean_type: 0,
        },
        stats: hourlyRows(id, now),
      })
    )
  );
  console.warn(`Imported energy history for ${ENERGY_METERS.length} meters`);
}

/** Creates a storage dashboard unless it exists; returns whether it was created. */
async function ensureStorageDashboard(
  socket: HassSocket,
  urlPath: string,
  title: string,
  icon: string
): Promise<boolean> {
  const dashboards = await socket.call({ type: "lovelace/dashboards/list" });
  const exists =
    Array.isArray(dashboards) &&
    dashboards.some((dashboard) => isObject(dashboard) && dashboard.url_path === urlPath);
  if (exists) {
    return false;
  }
  await socket.call({
    type: "lovelace/dashboards/create",
    url_path: urlPath,
    title,
    icon,
    mode: "storage",
    show_in_sidebar: true,
    require_admin: false,
  });
  return true;
}

const houseCard = {
  type: "custom:home-flow-card",
  title: "Edit me",
  clickable_entities: true,
  grid: { entity: "sensor.grid_power" },
  solar: { entity: "sensor.solar_power" },
  battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
};

/** Seeded only when created, so changes made in its editor survive the next bootstrap. */
async function ensureSeededDashboard(
  socket: HassSocket,
  urlPath: string,
  title: string,
  icon: string,
  config: JsonObject
): Promise<void> {
  if (await ensureStorageDashboard(socket, urlPath, title, icon)) {
    await socket.call({ type: "lovelace/config/save", url_path: urlPath, config });
  }
}

const PERIOD_CARD = "custom:energy-period-selector-plus";

const periodSection = (heading: string, icon: string, cards: JsonObject[]): JsonObject => ({
  type: "grid",
  cards: [{ type: "heading", heading, icon }, ...cards],
});

/**
 * Every selector drives the same energy collection, so the graph follows whichever was clicked
 * last and the others show that range too (as "custom" when it is none of their periods).
 */
const periodEditorConfig: JsonObject = {
  views: [
    {
      title: "Period selector",
      path: "periods",
      type: "sections",
      max_columns: 3,
      sections: [
        periodSection("Billing cycles", "mdi:receipt-text", [
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Bill on the 8th",
            compare_button_type: "icon",
            period_buttons: [
              "day",
              "month",
              { label: "Bill", duration: { months: 1 }, starts: "2026-01-08" },
            ],
          },
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Bill on the 31st (shorter months: their last day)",
            period_buttons: [
              "month",
              { label: "Bill", duration: { months: 1 }, starts: "2026-01-31" },
            ],
          },
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Bill on the 1st (same range as month)",
            period_buttons: [
              "month",
              { label: "Bill", duration: { months: 1 }, starts: "2026-01-01" },
            ],
          },
        ]),
        periodSection("Longer and shorter cycles", "mdi:calendar-range", [
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Quarter and contract year",
            period_buttons: [
              "month",
              { label: "Quarter", duration: { months: 3 }, starts: "2026-02-15" },
              { label: "Contract year", duration: { years: 1 }, starts: "2025-04-01" },
            ],
          },
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Every other Monday",
            today_button_type: "icon",
            period_buttons: [
              "week",
              { label: "Fortnight", duration: { weeks: 2 }, starts: "2026-01-05" },
            ],
          },
        ]),
        periodSection("Rolling windows, ending today", "mdi:calendar-clock", [
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Last 7 / 30 days, last 12 months",
            period_buttons: [
              "day",
              { label: "Last 7 days", duration: { days: 7 } },
              { label: "Last 30 days", duration: { days: 30 } },
              { label: "Last 12 months", duration: { months: 12 } },
            ],
          },
          {
            type: PERIOD_CARD,
            card_background: true,
            title: "Everything together",
            date_picker: true,
            compare_button_type: "text",
            period_buttons: [
              "day",
              "week",
              "month",
              { label: "Bill", duration: { months: 1 }, starts: "2026-01-08" },
              { label: "Last 30 days", duration: { days: 30 } },
              "year",
              "custom",
            ],
            custom_period_label: "Range",
          },
        ]),
        periodSection("What the selectors drive", "mdi:chart-bar", [
          { type: "energy-usage-graph" },
          {
            type: "custom:energy-flow-card-plus",
            energy_date_selection: true,
            entities: {
              grid: {
                entity: {
                  consumption: "sensor.grid_import_energy",
                  production: "sensor.grid_export_energy",
                },
              },
              solar: { entity: "sensor.solar_energy" },
            },
          },
        ]),
      ],
    },
  ],
};

async function main() {
  console.warn(`Waiting for Home Assistant at ${HASS_URL} ...`);
  await waitForHttp();
  const tokens = await onboard();
  await waitForRunning(tokens.access_token);
  const socket = await HassSocket.connect(tokens.access_token);
  try {
    await ensureLongLivedToken(socket);
    await saveEnergyPrefs(socket);
    await importEnergyHistory(socket);
    await ensureStorageDashboard(socket, EDITOR_DASHBOARD, "Card editors", "mdi:pencil");
    await ensureSeededDashboard(
      socket,
      HOUSE_EDITOR_DASHBOARD,
      "Home flow card editor",
      "mdi:home-edit",
      { views: [{ title: "House card", path: "house", cards: [houseCard] }] }
    );
    await ensureSeededDashboard(
      socket,
      PERIOD_EDITOR_DASHBOARD,
      "Period selector editor",
      "mdi:calendar-edit",
      periodEditorConfig
    );
  } finally {
    socket.close();
  }
  await callService(await readToken(), "script", "scenario_default");
  console.warn(
    `\nHome Assistant is ready at ${HASS_URL}\n  user: ${DEV_USER.username}\n  password: ${DEV_USER.password}\n`
  );
}

await main();
