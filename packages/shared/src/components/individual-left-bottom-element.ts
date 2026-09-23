import { type IndividualObject } from "@flixlix-cards/shared/states/raw/individual/get-individual-object";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type NewDur,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { computeIndividualFlowRate } from "@flixlix-cards/shared/utils/compute-flow-rate";
import { showLine } from "@flixlix-cards/shared/utils/show-line";
import { styleLine } from "@flixlix-cards/shared/utils/style-line";
import { html, nothing, svg } from "lit";
import { spacer } from "./spacer";
import { individualSecondarySpan } from "./spans/individual-secondary-span";

interface IndividualBottom {
  newDur: NewDur;
  templatesObj: TemplatesObj;
  individualObj?: IndividualObject;
  displayState: string;
}

export const individualLeftBottomElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  { individualObj, templatesObj, displayState, newDur }: IndividualBottom
) => {
  if (!individualObj) return spacer;
  const disableEntityClick = config.clickable_entities === false;
  const indexOfIndividual =
    config?.entities?.individual?.findIndex((e) => e.entity === individualObj.entity) || 0;
  const duration = newDur.individual[indexOfIndividual] || 0;
  const motionPath = "M40 40 v-40";
  const animationDuration = computeIndividualFlowRate(
    individualObj.field?.calculate_flow_rate !== false,
    duration
  );
  const animationDirectionClass = individualObj.invertAnimation ? "forward" : "reverse";
  return html`<div class="circle-container individual-bottom bottom">
    ${showLine(config, individualObj?.state || 0) && !config.entities.home?.hide
      ? html`
          <svg width="80" height="30">
            <path
              d=${motionPath}
              id="individual-bottom"
              class="${styleLine(individualObj?.state || 0, config)}"
            />
            ${checkShouldShowDots(config) &&
            individualObj?.state &&
            individualObj.state >= (individualObj.displayZeroTolerance ?? 0)
              ? svg`<circle
                    cx="40"
                    cy="40"
                    r="1.75"
                    class="individual-bottom individual-left-bottom-motion-dot ${animationDirectionClass}"
                    vector-effect="non-scaling-stroke"
                    style="${`animation-duration: ${animationDuration}s`}"
                  ></circle>`
              : nothing}
          </svg>
        `
      : html` <svg width="80" height="30"></svg> `}
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        main.onEntityClick(e, individualObj?.field, individualObj?.entity);
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(e, individualObj?.field, individualObj?.entity);
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(e, individualObj?.field, individualObj?.entity);
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(e, individualObj?.field, individualObj?.entity, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${individualSecondarySpan(
        main.hass,
        main,
        config,
        templatesObj,
        individualObj,
        indexOfIndividual,
        "left-bottom"
      )}
      ${individualObj?.icon !== " "
        ? html` <ha-icon id="individual-left-bottom-icon" .icon=${individualObj?.icon}></ha-icon>`
        : nothing}
      ${individualObj?.field?.display_zero_state !== false ||
      (individualObj?.state || 0) > (individualObj.displayZeroTolerance ?? 0)
        ? html` <span class="individual-bottom individual-left-bottom"
            >${individualObj?.showDirection
              ? html`<ha-icon
                  class="small"
                  .icon=${individualObj?.invertAnimation ? "mdi:arrow-up" : "mdi:arrow-down"}
                ></ha-icon>`
              : nothing}${displayState}
          </span>`
        : nothing}
    </div>
    <span class="label">${individualObj?.name}</span>
  </div> `;
};
