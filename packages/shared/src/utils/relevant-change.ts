import { type HomeAssistant } from "custom-card-helpers";
import { type PropertyValues } from "lit";
import { entityNamesChanged } from "./entity-name";

/**
 * Whether a new `hass` can change what a card shows: a state of one of its entities, the language,
 * the number format, the translations or how entity names resolve (registries and the name
 * formatter). Home Assistant keeps the state object of an unchanged
 * entity when it hands out a new `hass`.
 */
export const hasRelevantChange = (
  previous: HomeAssistant | undefined,
  hass: HomeAssistant,
  entityIds: readonly string[]
): boolean =>
  previous === undefined ||
  previous.localize !== hass.localize ||
  previous.locale?.language !== hass.locale?.language ||
  previous.locale?.number_format !== hass.locale?.number_format ||
  entityNamesChanged(previous, hass) ||
  entityIds.some((id) => previous.states[id] !== hass.states[id]);

/**
 * Lit `shouldUpdate` for a card: any change but a new `hass` updates it, a new `hass` alone only
 * when it has a relevant change.
 */
export const cardShouldUpdate = (
  changed: PropertyValues<{ hass: HomeAssistant }>,
  hass: HomeAssistant | undefined,
  entityIds: readonly string[]
): boolean =>
  hass === undefined ||
  changed.size !== 1 ||
  !changed.has("hass") ||
  hasRelevantChange(changed.get("hass"), hass, entityIds);
