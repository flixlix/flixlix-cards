import localize from "@flixlix-cards/shared/i18n";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  assert,
  assign,
  boolean,
  literal,
  object,
  optional,
  string,
  type,
  union,
} from "superstruct";
import type { EnergyPeriodSelectorPlusConfig } from "../types";

const baseLovelaceCardConfig = type({
  type: string(),
  view_layout: optional(object()),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    disable_compare: optional(boolean()),
    collection_key: optional(string()),
    vertical_opening_direction: optional(union([literal("auto"), literal("up"), literal("down")])),
    opening_direction: optional(
      union([literal("auto"), literal("right"), literal("left"), literal("center")])
    ),
    hide_overflow: optional(boolean()),
  })
);

const VERTICAL_OPENING_DIRECTIONS = ["auto", "up", "down"] as const;
const OPENING_DIRECTIONS = ["auto", "right", "left", "center"] as const;

@customElement("energy-period-selector-plus-editor")
export class EnergyPeriodSelectorPlusEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyPeriodSelectorPlusConfig;

  public setConfig(config: EnergyPeriodSelectorPlusConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = [
      {
        name: "",
        type: "grid" as const,
        schema: [
          {
            name: "vertical_opening_direction",
            required: false,
            selector: {
              select: {
                options: VERTICAL_OPENING_DIRECTIONS.map((direction) => ({
                  value: direction,
                  label: direction.charAt(0).toUpperCase() + direction.slice(1),
                })),
              },
            },
          },
          {
            name: "opening_direction",
            required: false,
            selector: {
              select: {
                options: OPENING_DIRECTIONS.map((direction) => ({
                  value: direction,
                  label: direction.charAt(0).toUpperCase() + direction.slice(1),
                })),
              },
            },
          },
          {
            name: "disable_compare",
            required: false,
            selector: { boolean: {} },
          },
          {
            name: "hide_overflow",
            required: false,
            selector: { boolean: {} },
          },
          {
            type: "string" as const,
            name: "collection_key",
            required: false,
          },
        ],
      },
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeHelperCallback = (schema: { name: string }) => {
    switch (schema.name) {
      case "collection_key":
        return localize("editor.collection_key_helper");
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (schema: { name: string }) =>
    localize(`editor.${schema.name}`) || schema.name;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-period-selector-plus-editor": EnergyPeriodSelectorPlusEditor;
  }
}
