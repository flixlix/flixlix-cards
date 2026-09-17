import { type HomeAssistant } from "custom-card-helpers";
import { type HassEntity } from "home-assistant-js-websocket";
import { type EntityName } from "../types/type";

const atLeastVersion = (hass: HomeAssistant, major: number, minor: number): boolean => {
  const [haMajor, haMinor] = (hass?.config?.version ?? "").split(".", 2);
  return Number(haMajor) > major || (Number(haMajor) === major && Number(haMinor) >= minor);
};

/**
 * `hass.formatEntityName` only accepts a card's `name` option (a user string, a
 * structured name, or undefined) from HA 2026.4. Earlier versions expose the same
 * helper with an incompatible signature - bare type strings in 2025.10, and only
 * structured items between 2025.11 and 2026.3 - so feature detection is not
 * enough and the version has to be checked.
 */
const hasEntityNameHelper = (hass: HomeAssistant | undefined): boolean =>
  typeof (hass as { formatEntityName?: unknown } | undefined)?.formatEntityName === "function";

// A hass can report a recent version without carrying the helper (a test harness,
// or a hass that has not finished initialising), and calling it then throws - so
// the version gate alone is not enough.
const supportsEntityNames = (hass: HomeAssistant): boolean =>
  hasEntityNameHelper(hass) && atLeastVersion(hass, 2026, 4);

/**
 * The `entity_name` selector, which lets users compose a name out of registry
 * parts in the visual editor, was added in HA 2025.11.
 */
export const supportsEntityNameSelector = (hass: HomeAssistant): boolean =>
  atLeastVersion(hass, 2025, 11);

type HassWithEntityNames = HomeAssistant & {
  formatEntityName: (stateObj: HassEntity, name: EntityName | undefined) => string;
};

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
  const configuredName = typeof name === "string" ? name : undefined;

  if (!stateObj) return configuredName;
  if (supportsEntityNames(hass)) {
    return (hass as HassWithEntityNames).formatEntityName(stateObj, name) || undefined;
  }
  return configuredName || stateObj.attributes?.friendly_name;
};

/**
 * `formatEntityName` resolves against the entity/device/area/floor registries,
 * and HA swaps the real formatter in asynchronously once translations load.
 * Neither shows up as an entity state change, so without this a rename (or that
 * swap) leaves rendered names stale until an unrelated state change forces a render.
 */
const NAME_SOURCES = ["formatEntityName", "entities", "devices", "areas", "floors"] as const;

export const entityNamesChanged = (
  oldHass: HomeAssistant | undefined,
  newHass: HomeAssistant | undefined
): boolean => {
  if (!oldHass || !newHass) return false;
  const before = oldHass as unknown as Record<string, unknown>;
  const after = newHass as unknown as Record<string, unknown>;
  return NAME_SOURCES.some((key) => before[key] !== after[key]);
};
