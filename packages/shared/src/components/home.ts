import { type HomeRing } from "@flixlix-cards/shared/card-state";
import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type HomeObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, svg } from "lit";
import { generalSecondarySpan } from "./spans/general-secondary-span";

export const homeElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  { home, ring, showLabel }: { home: HomeObject; ring: HomeRing; showLabel: boolean }
) => {
  const { entities } = config;
  const isHomeEntityDefined = entities.home?.entity !== undefined;
  const noActionSet = new Set(["none", undefined]);
  const staticAction =
    !noActionSet.has(entities.home?.tap_action?.action) ||
    !noActionSet.has(entities.home?.hold_action?.action) ||
    !noActionSet.has(entities.home?.double_tap_action?.action);
  const isClickable = isHomeEntityDefined || staticAction;
  const disableEntityClick = !config.clickable_entities || !isClickable;

  return html`
    <div class="circle-container home">
      <div
        class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
        tabindex=${disableEntityClick ? nothing : 0}
        role=${disableEntityClick ? nothing : "button"}
        id="home-circle"
        @click=${(e: MouseEvent) => {
          main.onEntityClick(e, entities.home, entities.home?.entity);
        }}
        @dblclick=${(e: MouseEvent) => {
          main.onEntityDoubleClick(e, entities.home, entities.home?.entity);
        }}
        @pointerdown=${(e: PointerEvent) => {
          main.onEntityPointerDown(e, entities.home, entities.home?.entity);
        }}
        @pointerup=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @pointercancel=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @keydown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
          if (e.key === "Enter") {
            main.openDetails(e, entities.home, entities.home?.entity, "tap");
          }
        }}
      >
        <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
        ${generalSecondarySpan(main, home.secondary, "home")}
        ${home.icon !== " " ? html`<ha-icon id="home-icon" .icon=${home.icon}></ha-icon>` : nothing}
        ${ring.usageText}
        <svg class="home-circle-sections">
          <circle
            class="solar"
            cx="40"
            cy="40"
            r="38"
            stroke-dasharray="${ring.solar} ${CIRCLE_CIRCUMFERENCE - ring.solar}"
            shape-rendering="geometricPrecision"
            stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - ring.solar}"
          />
          ${
            ring.battery
              ? svg`<circle
                  class="battery"
                  cx="40"
                  cy="40"
                  r="38"
                  stroke-dasharray="${ring.battery} ${CIRCLE_CIRCUMFERENCE - ring.battery}"
                  stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - ring.battery - ring.solar}"
                  shape-rendering="geometricPrecision"
                />`
              : nothing
          }
          <circle
            class="low-carbon"
            cx="40"
            cy="40"
            r="38"
            stroke-dasharray="${ring.nonFossil} ${CIRCLE_CIRCUMFERENCE - ring.nonFossil}"
            stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - ring.nonFossil - ring.battery - ring.solar}"
            shape-rendering="geometricPrecision"
          />
          <circle
            class="grid"
            cx="40"
            cy="40"
            r="38"
            stroke-dasharray="${ring.grid} ${CIRCLE_CIRCUMFERENCE - ring.grid}"
            stroke-dashoffset="0"
            shape-rendering="geometricPrecision"
          />
        </svg>
      </div>
      ${
        !showLabel
          ? html`<span class="label"></span>`
          : html`<span class="label">${home.name}</span>`
      }
    </div>
  `;
};
