import localize from "@flixlix-cards/shared/i18n";
import { mdiEyeOutline, mdiPowerPlugOffOutline } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";
import { css, html } from "lit";

/**
 * The car's visibility and idle conditions, edited with Home Assistant's own conditions editor:
 * the one its cards' visibility tab uses, so they read and work the same, without YAML.
 */

/** Home Assistant's conditions editor, defined while a dashboard is being edited. */
export const conditionsEditorAvailable = () =>
  customElements.get("ha-card-conditions-editor") !== undefined;

const LISTS = [
  { key: "visibility", icon: mdiEyeOutline },
  { key: "idle", icon: mdiPowerPlugOffOutline },
] as const;

type ConditionList = (typeof LISTS)[number]["key"];

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

const conditionsOf = (car: Record<string, unknown> | undefined, key: ConditionList): unknown[] => {
  const conditions = car?.[key];
  return isList(conditions) ? conditions : [];
};

/** The two condition lists, each in a panel that opens when it holds conditions. */
export const carConditionsHtml = (
  hass: HomeAssistant,
  car: Record<string, unknown> | undefined,
  onChange: (car: Record<string, unknown>) => void
) =>
  LISTS.map(({ key, icon }) => {
    const conditions = conditionsOf(car, key);
    const changed = (event: CustomEvent<{ value: unknown }>) => {
      event.stopPropagation();
      const { [key]: _old, ...rest } = car ?? {};
      const value = event.detail.value;
      // an empty list is left out, so the default applies again
      onChange(isList(value) && value.length > 0 ? { ...rest, [key]: value } : rest);
    };
    return html`<ha-expansion-panel
      class="conditions ${key}"
      outlined
      .header=${localize(`editor.${key}`)}
      .expanded=${conditions.length > 0}
    >
      <ha-svg-icon slot="leading-icon" .path=${icon}></ha-svg-icon>
      <p class="hint">
        ${localize(`editor.car_${key}_hint`)} ${localize("editor.car_conditions_ignored")}
      </p>
      <ha-card-conditions-editor
        .hass=${hass}
        .conditions=${conditions}
        @value-changed=${changed}
      ></ha-card-conditions-editor>
    </ha-expansion-panel>`;
  });

export const carConditionsStyles = css`
  ha-expansion-panel.conditions {
    display: block;
    margin-top: 16px;
  }

  ha-expansion-panel.conditions .hint {
    margin: 0 0 12px;
    color: var(--secondary-text-color);
  }
`;
