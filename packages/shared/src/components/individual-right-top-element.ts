import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import { type CardMainContext, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { html, nothing, svg } from "lit";
import { spacer } from "./spacer";
import { individualSecondarySpan } from "./spans/individual-secondary-span";

export const individualRightTopElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    slot,
    animate,
    hasBottomRow,
  }: { slot: IndividualSlot | undefined; animate: boolean; hasBottomRow: boolean }
) => {
  if (!slot) {
    return spacer;
  }
  const individualObj = slot.node;
  const disableEntityClick = !config.clickable_entities;

  return html`<div class="circle-container individual-top individual-right individual-right-top">
    <span class="label">${individualObj.name}</span>
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
      ${individualSecondarySpan(main, individualObj, "right-top")}
      ${
        individualObj.icon !== " "
          ? html` <ha-icon id="individual-right-top-icon" .icon=${individualObj.icon}></ha-icon>`
          : nothing
      }
      ${
        individualObj?.field?.display_zero_state !== false ||
        (individualObj.state ?? 0) > (individualObj.displayZeroTolerance ?? 0)
          ? html` <span class="individual-top individual-right-top">
              ${
                individualObj?.showDirection
                  ? html`<ha-icon
                      class="small"
                      .icon=${individualObj.invertAnimation ? "mdi:arrow-down" : "mdi:arrow-up"}
                    ></ha-icon>`
                  : nothing
              }${individualObj.displayState}
            </span>`
          : nothing
      }
    </div>
    ${
      slot.flow.visible
        ? html`
            <div class="right-individual-flow-container">
              <svg
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
                class="right-individual-flow"
              >
                <path
                  id="individual-top-right-home"
                  class="${slot.flow.lineClass}"
                  d="M${hasBottomRow ? 45 : 47},0 v15 c0,${
                    hasBottomRow ? "30 -10,30 -30,30" : "35 -10,35 -30,35"
                  } h-20"
                  vector-effect="non-scaling-stroke"
                />
                ${
                  animate &&
                  individualObj.state &&
                  individualObj.state >= (individualObj.displayZeroTolerance ?? 0)
                    ? svg`<circle r="1" class="individual-top" vector-effect="non-scaling-stroke">
                      <animateMotion
                        dur="${slot.flow.durationSeconds}s"
                        repeatCount="indefinite"
                        calcMode="paced"
                        keyPoints="${individualObj.invertAnimation ? "0;1" : "1;0"}"
                        keyTimes="0;1"
                      >
                        <mpath xlink:href="#individual-top-right-home" />
                      </animateMotion>
                    </circle>`
                    : nothing
                }
              </svg>
            </div>
          `
        : nothing
    }
  </div>`;
};
