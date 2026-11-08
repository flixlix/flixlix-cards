import { type HomeAssistant } from "custom-card-helpers";
import { type HassEntity } from "home-assistant-js-websocket";
import { type EntityName } from "../types/type";
import { nonEmpty } from "./utils";

const atLeastVersion = (hass: HomeAssistant, major: number, minor: number): boolean => {
  const [haMajor, haMinor] = (hass?.config?.version ?? "").split(".", 2);
  return Number(haMajor) > major || (Number(haMajor) === major && Number(haMinor) >= minor);
};

type HassWithEntityNames = HomeAssistant & {
  formatEntityName: (stateObj: HassEntity, name: EntityName | undefined) => string;
};

/**
 * `hass.formatEntityName` only accepts a card's `name` option (a user string, a
 * structured name, or undefined) from HA 2026.4. Earlier versions expose the same
 * helper with an incompatible signature - bare type strings in 2025.10, and only
 * structured items between 2025.11 and 2026.3 - so feature detection is not
 * enough and the version has to be checked. A hass can also report a recent
 * version without carrying the helper (a test harness, or a hass that has not
 * finished initialising), so the version gate alone is not enough either.
 */
const supportsEntityNames = (hass: HomeAssistant): hass is HassWithEntityNames =>
  typeof Reflect.get(hass, "formatEntityName") === "function" && atLeastVersion(hass, 2026, 4);

/**
 * Resolves a `name` option against the entity's registry context (entity,
 * device, area, floor). Falls back to the friendly name on Home Assistant
 * versions that cannot resolve a structured name.
 */
export const computeEntityName = (
  hass: HomeAssistant,
  stateObj: HassEntity | undefined,
  name: EntityName | undefined
): string | undefined => {
  const configuredName = typeof name === "string" ? nonEmpty(name) : undefined;
  if (!stateObj) {
    return configuredName;
  }
  if (supportsEntityNames(hass)) {
    return nonEmpty(hass.formatEntityName(stateObj, name));
  }
  return configuredName ?? nonEmpty(stateObj.attributes?.friendly_name);
};

/**
 * `formatEntityName` resolves against the entity/device/area/floor registries,
 * and HA swaps the real formatter in asynchronously once translations load.
 * Neither shows up as an entity state change.
 */
const NAME_SOURCES = ["formatEntityName", "entities", "devices", "areas", "floors"] as const;

/** Whether a new `hass` can resolve entity names differently than the previous one. */
export const entityNamesChanged = (previous: HomeAssistant, hass: HomeAssistant): boolean =>
  NAME_SOURCES.some((key) => Reflect.get(previous, key) !== Reflect.get(hass, key));
