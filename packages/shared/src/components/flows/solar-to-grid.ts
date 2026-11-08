import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

const solarToGridDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toGrid || !solar.has) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="return" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToGrid.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#return" />
      </animateMotion>
    </circle>`;
};

export const flowSolarToGrid = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.solarToGrid.visible || !paths.solarToGrid) {
    return nothing;
  }

  return html`<svg class="flow" id="solar-grid-flow" viewBox=${context.viewBox}>
    <path
      id="return"
      class="return ${flows.solarToGrid.lineClass}"
      d=${paths.solarToGrid.d}
      vector-effect="non-scaling-stroke"
    ></path>
    ${keyed(paths.solarToGrid.d, solarToGridDot(context))}
  </svg>`;
};
