import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

const gridToHomeDot = ({ animate, grid, flows, paths }: Flows) => {
  if (!animate || !grid.state.toHome) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="grid" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.gridToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#grid" />
      </animateMotion>
    </circle>`;
};

export const flowGridToHome = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.gridToHome.visible || !paths.gridToHome) {
    return nothing;
  }

  return html`<svg class="flow" id="grid-home-flow" viewBox=${context.viewBox}>
    <path
      class="grid ${flows.gridToHome.lineClass}"
      id="grid"
      d=${paths.gridToHome}
      vector-effect="non-scaling-stroke"
    ></path>
    ${keyed(paths.gridToHome, gridToHomeDot(context))}
  </svg>`;
};
