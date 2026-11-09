import localize from "@flixlix-cards/shared/i18n";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";

/** The part of an ha-form schema entry that ha-form hands to `computeLabel`. */
export interface HaFormLabelSchema {
  name: string;
  /** Our `editor.*` translation key, for a field whose name is labelled differently on another node. */
  translation_key?: string;
}

/** `value-changed` as fired by ha-form and ha-entity-picker. */
export type ValueChangedEvent<T> = CustomEvent<{ value: T }>;

/** HA's generic card-editor translation when it has one (it returns `""` otherwise), else ours. */
export const computeEditorLabel = (
  hass: HomeAssistant | undefined,
  schema: HaFormLabelSchema
): string =>
  nonEmpty(hass?.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`)) ??
  localize(`editor.${schema.translation_key ?? schema.name}`);
