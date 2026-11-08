import { type Flow } from "@flixlix-cards/shared/card-state";
import { spacer } from "@flixlix-cards/shared/components/spacer";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type NonFossilObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, type TemplateResult } from "lit";
import { flowDot } from "./flow-dot";
import { generalSecondarySpan } from "./spans/general-secondary-span";

export const nonFossilElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  { nonFossil, flow, animate }: { nonFossil: NonFossilObject; flow: Flow; animate: boolean }
): TemplateResult => {
  const { entities } = config;
  const disableEntityClick = !config.clickable_entities;
  if (!nonFossil.hasPercentage) {
    return spacer;
  }
  return html`<div class="circle-container low-carbon">
    <span class="label">${nonFossil.name}</span>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      tabindex=${disableEntityClick ? nothing : 0}
      role=${disableEntityClick ? nothing : "button"}
      @click=${(e: MouseEvent) => {
        main.onEntityClick(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keydown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(
            e,
            entities.fossil_fuel_percentage,
            entities.fossil_fuel_percentage?.entity,
            "tap"
          );
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${generalSecondarySpan(main, nonFossil.secondary, "nonFossilFuel")}
      ${
        nonFossil.icon !== " "
          ? html` <ha-icon id="low-carbon-icon" .icon=${nonFossil.icon}></ha-icon>`
          : nothing
      }
      ${
        entities.fossil_fuel_percentage?.display_zero_state !== false ||
        (nonFossil.state.power ?? 0) >
          (entities.fossil_fuel_percentage?.display_zero_tolerance ?? 0)
          ? html` <span class="low-carbon">${nonFossil.display}</span> `
          : nothing
      }
    </div>
    ${
      flow.visible
        ? html`
            <svg width="80" height="30">
              <path d="M40 -10 v40" class="low-carbon ${flow.lineClass}" id="low-carbon" />
            </svg>
            ${
              animate && nonFossil.has && (nonFossil.state.power ?? 0) > 0
                ? flowDot({
                    path: "low-carbon",
                    className: "low-carbon",
                    durationSeconds: flow.durationSeconds,
                    radius: 1.75,
                  })
                : nothing
            }
          `
        : nothing
    }
  </div>`;
};
