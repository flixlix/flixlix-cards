import { auxiliaryConnection, type Flow } from "@flixlix-cards/shared/card-state";
import {
  type AuxiliaryConnection,
  type CardMainContext,
  type FlowCardPlusConfig,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { html, nothing } from "lit";
import { flowDot } from "./flow-dot";
import { type FlowLine } from "./flows/geometry";
import { deviceCircle, type DirectionArrows, isFlowing } from "./individual-element";
import { spacer } from "./spacer";

const ARROWS: Record<AuxiliaryConnection, DirectionArrows> = {
  grid: { inflow: "mdi:arrow-down", outflow: "mdi:arrow-up" },
  battery: { inflow: "mdi:arrow-left", outflow: "mdi:arrow-right" },
  none: { inflow: "mdi:arrow-down", outflow: "mdi:arrow-up" },
};

/** The auxiliary node under the grid, left of the battery. */
export const auxiliaryElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  node: IndividualObject
) => {
  if (!node.has) {
    return spacer;
  }
  return html`<div class="circle-container auxiliary">
    ${deviceCircle(main, config, node, {
      iconId: "auxiliary-icon",
      valueClass: "auxiliary",
      secondaryClass: "auxiliary",
      arrows: ARROWS[auxiliaryConnection(config)],
    })}
    <span class="label">${node.name}</span>
  </div>`;
};

/** The line is drawn from the auxiliary node, so a dot flowing into it runs in reverse. */
export const auxiliaryFlow = (
  node: IndividualObject,
  flow: Flow,
  line: FlowLine | undefined,
  { animate, scale, viewBox }: { animate: boolean; scale: number; viewBox: string }
) => {
  if (!flow.visible || !line) {
    return nothing;
  }
  return html`<svg class="flow auxiliary" id="auxiliary-flow" viewBox=${viewBox}>
      <path
        id="auxiliary-line"
        class="${flow.lineClass}"
        d=${line.d}
        vector-effect="non-scaling-stroke"
      />
    </svg>
    ${
      animate && isFlowing(node)
        ? flowDot({
            path: "auxiliary-line",
            className: "auxiliary",
            durationSeconds: flow.durationSeconds,
            radius: scale,
            reverse: !node.invertAnimation,
          })
        : nothing
    }`;
};
