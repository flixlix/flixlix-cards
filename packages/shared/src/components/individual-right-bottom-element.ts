import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import { type CardMainContext, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { html, nothing, svg } from "lit";
import { spacer } from "./spacer";
import { individualSecondarySpan } from "./spans/individual-secondary-span";

export const individualRightBottomElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  { slot, animate }: { slot: IndividualSlot | undefined; animate: boolean }
) => {
  if (!slot) {
    return spacer;
  }
  const individualObj = slot.node;
  const disableEntityClick = !config.clickable_entities;

  return html`<div
    class="circle-container individual-bottom individual-right individual-right-bottom"
  >
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
      ${individualSecondarySpan(main, individualObj, "right-bottom")}
      ${
        individualObj.icon !== " "
          ? html` <ha-icon id="individual-right-bottom-icon" .icon=${individualObj.icon}></ha-icon>`
          : nothing
      }
      ${
        individualObj?.field?.display_zero_state !== false ||
        (individualObj.state ?? 0) > (individualObj.displayZeroTolerance ?? 0)
          ? html` <span class="individual-bottom individual-right-bottom">
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
    <span class="label">${individualObj.name}</span>
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
                  id="individual-bottom-right-home"
                  class="${slot.flow.lineClass}"
                  d="M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20"
                  vector-effect="non-scaling-stroke"
                />
                ${
                  animate &&
                  individualObj.state &&
                  individualObj.state >= (individualObj.displayZeroTolerance ?? 0)
                    ? svg`<circle r="1" class="individual-bottom" vector-effect="non-scaling-stroke">
                      <animateMotion
                        dur="${slot.flow.durationSeconds}s"
                        repeatCount="indefinite"
                        calcMode="paced"
                        keyPoints="${individualObj.invertAnimation ? "0;1" : "1;0"}"
                        keyTimes="0;1"
                      >
                        <mpath xlink:href="#individual-bottom-right-home" />
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
