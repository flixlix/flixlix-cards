import { describe, expect, test } from "vite-plus/test";
import { fakeEntity, fakeHass } from "../testing/fixtures";
import { type EnergyPreferences } from "./energy-dashboard-entities";
import { getDefaultConfig } from "./get-default-config";
import { type HomeAssistant } from "custom-card-helpers";

const power = (id: string, state = "100", attributes: Record<string, unknown> = {}) =>
  fakeEntity(id, state, { device_class: "power", unit_of_measurement: "W", ...attributes });
const energy = (id: string, attributes: Record<string, unknown> = {}) =>
  fakeEntity(id, "1234", { device_class: "energy", unit_of_measurement: "kWh", ...attributes });
const percent = (id: string, attributes: Record<string, unknown> = {}) =>
  fakeEntity(id, "65", { unit_of_measurement: "%", ...attributes });

const statesOf = (...entities: HomeAssistant["states"][string][]): HomeAssistant["states"] =>
  Object.fromEntries(entities.map((entity) => [entity.entity_id, entity]));

const noEnergyDashboard: HomeAssistant["callWS"] = () =>
  Promise.reject({ code: "not_found", message: "No prefs" });

const withEnergyDashboard =
  (preferences: EnergyPreferences): HomeAssistant["callWS"] =>
  <T>() =>
    Promise.resolve(preferences as T);

const DASHBOARD_STATES = statesOf(
  power("sensor.meter_import_power"),
  power("sensor.meter_export_power"),
  power("sensor.grid_power_generated"),
  power("sensor.inverter_pv_power"),
  power("sensor.inverter_dc_power"),
  power("sensor.wallbox_power"),
  power("sensor.sauna_power"),
  power("sensor.sauna_heater_power"),
  energy("sensor.meter_import_energy"),
  energy("sensor.meter_export_energy"),
  energy("sensor.inverter_pv_energy"),
  energy("sensor.inverter_dc_discharge_energy"),
  energy("sensor.inverter_dc_charge_energy"),
  energy("sensor.wallbox_energy"),
  energy("sensor.sauna_energy"),
  energy("sensor.sauna_heater_energy"),
  percent("sensor.inverter_dc_level", { device_class: "battery" })
);

const DASHBOARD: EnergyPreferences = {
  energy_sources: [
    {
      type: "grid",
      stat_energy_from: "sensor.meter_import_energy",
      stat_energy_to: "sensor.meter_export_energy",
      stat_rate: "sensor.grid_power_generated",
    },
    {
      type: "solar",
      stat_energy_from: "sensor.inverter_pv_energy",
      stat_rate: "sensor.inverter_pv_power",
    },
    {
      type: "battery",
      stat_energy_from: "sensor.inverter_dc_discharge_energy",
      stat_energy_to: "sensor.inverter_dc_charge_energy",
      stat_rate: "sensor.inverter_dc_power",
      stat_soc: "sensor.inverter_dc_level",
    },
    { type: "gas" },
  ],
  device_consumption: [
    { stat_consumption: "sensor.wallbox_energy", stat_rate: "sensor.wallbox_power", name: "Car" },
    { stat_consumption: "sensor.sauna_energy", stat_rate: "sensor.sauna_power" },
    {
      stat_consumption: "sensor.sauna_heater_energy",
      stat_rate: "sensor.sauna_heater_power",
      included_in_stat: "sensor.sauna_energy",
    },
  ],
};

describe("getDefaultConfig from the energy dashboard", () => {
  test("power cards get the dashboard's power sensors and top-level devices", async () => {
    const hass = fakeHass({ states: DASHBOARD_STATES, callWS: withEnergyDashboard(DASHBOARD) });

    const { entities } = await getDefaultConfig(hass, "power");

    expect(entities).toEqual({
      grid: { entity: "sensor.grid_power_generated" },
      solar: { entity: "sensor.inverter_pv_power" },
      battery: { entity: "sensor.inverter_dc_power", state_of_charge: "sensor.inverter_dc_level" },
      individual: [
        { entity: "sensor.wallbox_power", name: "Car" },
        { entity: "sensor.sauna_power" },
      ],
    });
  });

  test("energy cards get its meters, with import and discharge as consumption", async () => {
    const hass = fakeHass({ states: DASHBOARD_STATES, callWS: withEnergyDashboard(DASHBOARD) });

    const { entities } = await getDefaultConfig(hass, "energy");

    expect(entities.grid?.entity).toEqual({
      consumption: "sensor.meter_import_energy",
      production: "sensor.meter_export_energy",
    });
    expect(entities.battery?.entity).toEqual({
      consumption: "sensor.inverter_dc_discharge_energy",
      production: "sensor.inverter_dc_charge_energy",
    });
    expect(entities.solar?.entity).toBe("sensor.inverter_pv_energy");
    expect(entities.individual).toEqual([
      { entity: "sensor.wallbox_energy", name: "Car" },
      { entity: "sensor.sauna_energy" },
    ]);
  });

  test("several sources of one kind are summed", async () => {
    const hass = fakeHass({
      states: statesOf(
        energy("sensor.peak_energy"),
        energy("sensor.offpeak_energy"),
        energy("sensor.return_energy"),
        energy("sensor.roof_energy"),
        energy("sensor.garage_roof_energy")
      ),
      callWS: withEnergyDashboard({
        energy_sources: [
          {
            type: "grid",
            stat_energy_from: "sensor.peak_energy",
            stat_energy_to: "sensor.return_energy",
          },
          { type: "grid", stat_energy_from: "sensor.offpeak_energy", stat_energy_to: null },
          { type: "solar", stat_energy_from: "sensor.roof_energy" },
          { type: "solar", stat_energy_from: "sensor.garage_roof_energy" },
        ],
        device_consumption: [],
      }),
    });

    const { entities } = await getDefaultConfig(hass, "energy");

    expect(entities.grid?.entity).toEqual({
      consumption: "sensor.peak_energy | sensor.offpeak_energy",
      production: "sensor.return_energy",
    });
    expect(entities.solar?.entity).toBe("sensor.roof_energy | sensor.garage_roof_energy");
  });

  test("nodes the dashboard leaves out are guessed by name, without reusing its entities", async () => {
    const hass = fakeHass({
      states: statesOf(power("sensor.grid_power"), power("sensor.home_battery_power")),
      callWS: withEnergyDashboard({
        energy_sources: [
          {
            type: "grid",
            stat_energy_from: "sensor.grid_import",
            stat_energy_to: null,
            stat_rate: "sensor.grid_power",
          },
        ],
        device_consumption: [],
      }),
    });

    const { entities } = await getDefaultConfig(hass, "power");

    expect(entities.grid?.entity).toBe("sensor.grid_power");
    expect(entities.battery?.entity).toBe("sensor.home_battery_power");
    expect(entities.solar).toBeUndefined();
  });

  test("a failing energy dashboard request is not mistaken for a missing dashboard", async () => {
    const hass = fakeHass({ callWS: () => Promise.reject(new Error("Connection lost")) });

    await expect(getDefaultConfig(hass, "power")).rejects.toThrow("Connection lost");
  });
});

const guess = (states: HomeAssistant["states"], family: "power" | "energy" = "power") =>
  getDefaultConfig(fakeHass({ states, callWS: noEnergyDashboard }), family);

describe("getDefaultConfig without an energy dashboard", () => {
  test("detects grid, solar, battery and its state of charge by name", async () => {
    const config = await guess(
      statesOf(
        power("sensor.grid_power", "1200", { friendly_name: "Grid Power" }),
        power("sensor.solar_power", "800", { friendly_name: "Solar Power" }),
        power("sensor.home_battery_power", "300", { friendly_name: "Home Battery" }),
        percent("sensor.battery_level", { device_class: "battery" })
      )
    );

    expect(config.entities.grid?.entity).toBe("sensor.grid_power");
    expect(config.entities.solar?.entity).toBe("sensor.solar_power");
    expect(config.entities.battery?.entity).toBe("sensor.home_battery_power");
    expect(config.entities.battery?.state_of_charge).toBe("sensor.battery_level");
  });

  test("ignores look-alikes: other domains, unavailable sensors, forecasts and words inside words", async () => {
    const { entities } = await guess(
      statesOf(
        fakeEntity("switch.grid_power_strip", "on"),
        power("sensor.grid_power", "unavailable"),
        power("sensor.solar_power_forecast"),
        power("sensor.internet_router_power"),
        power("sensor.mains_power"),
        power("sensor.pv_power")
      )
    );

    expect(entities.grid?.entity).toBe("sensor.mains_power");
    expect(entities.solar?.entity).toBe("sensor.pv_power");
  });

  test("a sensor naming two nodes is left for the user to place", async () => {
    const { entities } = await guess(statesOf(power("sensor.battery_grid_power")));

    expect(entities).toEqual({});
  });

  test("the home battery's state of charge wins over a phone's battery level", async () => {
    const { entities } = await guess(
      statesOf(
        power("sensor.sonnen_battery_power"),
        percent("sensor.pixel_battery_level", { device_class: "battery" }),
        percent("sensor.sonnen_battery_soc", { device_class: "battery" })
      )
    );

    expect(entities.battery?.state_of_charge).toBe("sensor.sonnen_battery_soc");
  });

  test("the plainest name wins", async () => {
    const { entities } = await guess(
      statesOf(power("sensor.grid_import_power"), power("sensor.grid_power"))
    );

    expect(entities.grid?.entity).toBe("sensor.grid_power");
  });
});
