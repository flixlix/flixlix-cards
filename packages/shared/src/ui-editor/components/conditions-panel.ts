import localize from "@flixlix-cards/shared/i18n";
import { type HomeAssistant } from "custom-card-helpers";
import { css, html, nothing } from "lit";

/**
 * Conditions edited with Home Assistant's own conditions editor: the one its cards' visibility
 * tab uses, so they read and work the same, without YAML.
 */

/** Home Assistant's conditions editor, defined while a dashboard is being edited. */
export const conditionsEditorAvailable = () =>
  customElements.get("ha-card-conditions-editor") !== undefined;

export type ConditionsPanel = {
  /** Also the panel's class, to tell panels apart. */
  key: string;
  header: string;
  /** Names the list when the header names a section around it. */
  label?: string;
  /** What the conditions do; the conditions a card cannot check follow it. */
  hint: string;
  icon: string;
  conditions: unknown[];
  onChange: (conditions: unknown) => void;
};

/** A panel holding one list of conditions, open while it holds any. */
export const conditionsPanelHtml = (
  hass: HomeAssistant,
  { key, header, label, hint, icon, conditions, onChange }: ConditionsPanel
) => {
  const changed = (event: CustomEvent<{ value: unknown }>) => {
    event.stopPropagation();
    onChange(event.detail.value);
  };
  return html`<ha-expansion-panel
    class="conditions ${key}"
    outlined
    .header=${header}
    .expanded=${conditions.length > 0}
  >
    <ha-svg-icon slot="leading-icon" .path=${icon}></ha-svg-icon>
    ${label ? html`<h4 class="label">${label}</h4>` : nothing}
    <p class="hint">${hint} ${localize("editor.conditions_ignored")}</p>
    <ha-card-conditions-editor
      .hass=${hass}
      .conditions=${conditions}
      @value-changed=${changed}
    ></ha-card-conditions-editor>
  </ha-expansion-panel>`;
};

export const conditionsPanelStyles = css`
  ha-expansion-panel.conditions {
    display: block;
    margin-top: 16px;
  }

  ha-expansion-panel.conditions .label {
    margin: 0 0 4px;
  }

  ha-expansion-panel.conditions .hint {
    margin: 0 0 12px;
    color: var(--secondary-text-color);
  }
`;
