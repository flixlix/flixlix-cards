import { type HeatPumpReading } from "@flixlix-cards/shared/card-state";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type HomeAssistant } from "custom-card-helpers";
import { type HassEntity } from "home-assistant-js-websocket";
import { type Figure, type HeatPumpConfig, type LabelStatus } from "./labels";
import { type HouseHeatPump } from "./types";

/** The heat pump's power in W, or null while its entity is unavailable. */
const heatPumpPower = (hass: HomeAssistant, heatPump: HouseHeatPump): number | null =>
  getEntityState(hass, heatPump.entity) === null
    ? null
    : getEntityStateWatts(hass, heatPump.entity);

/** The entities the heat pump reads, so the card redraws when they change. */
export const heatPumpEntities = (heatPump: HouseHeatPump | undefined): string[] =>
  [heatPump?.entity, heatPump?.climate].filter((id): id is string => Boolean(id));

/** Home Assistant's own formatters, newer than custom-card-helpers' types. */
type Formatters = {
  formatEntityState?: (stateObj: HassEntity) => string;
  formatEntityAttributeValue?: (stateObj: HassEntity, attribute: string) => string;
};

const humanize = (value: string) => {
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const HEATING = new Set(["heating", "preheating", "heat"]);
const COOLING = new Set(["cooling", "cool"]);

/**
 * What the heat pump is doing, in Home Assistant's words: its `hvac_action` where the integration
 * reports one, its HVAC mode otherwise.
 */
const stateStatus = (hass: HomeAssistant & Formatters, climate: HassEntity): LabelStatus => {
  const action: unknown = climate.attributes.hvac_action;
  const value = typeof action === "string" ? action : climate.state;
  const word =
    typeof action === "string"
      ? (hass.formatEntityAttributeValue?.(climate, "hvac_action") ?? humanize(action))
      : (hass.formatEntityState?.(climate) ?? humanize(climate.state));
  const direction = HEATING.has(value) ? "heating" : COOLING.has(value) ? "cooling" : undefined;
  return { word, direction };
};

const temperatureOf = (hass: HomeAssistant, value: unknown): Figure | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const unit = hass.config?.unit_system?.temperature ?? "°C";
  return { value, decimals: Number.isInteger(value) ? 0 : 1, suffix: ` ${unit}` };
};

/** The label's status line as the heat pump's `status` asks, or none without a climate entity. */
const heatPumpStatus = (hass: HomeAssistant, heatPump: HouseHeatPump): LabelStatus | undefined => {
  const climate = heatPump.climate ? hass.states[heatPump.climate] : undefined;
  if (!climate || climate.state === "unavailable" || climate.state === "unknown") {
    return undefined;
  }
  const status = heatPump.status ?? "state";
  if (status === "state") {
    return stateStatus(hass, climate);
  }
  const figure = temperatureOf(hass, climate.attributes.current_temperature);
  const target =
    status === "temperature_and_target"
      ? temperatureOf(hass, climate.attributes.temperature)
      : undefined;
  // a target alone would read as the current temperature
  return figure ? { figure, target, word: "" } : undefined;
};

/** What the wires and the label need from a configured heat pump. */
export const heatPumpScene = (
  hass: HomeAssistant,
  heatPump: HouseHeatPump | undefined
): { reading: HeatPumpReading | undefined; label: HeatPumpConfig } => ({
  reading: heatPump && { power: heatPumpPower(hass, heatPump) },
  label: heatPump && {
    name: heatPump.name,
    entity: heatPump.climate ?? heatPump.entity,
    status: heatPumpStatus(hass, heatPump),
  },
});
