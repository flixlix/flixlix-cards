import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

const gridToHomeDot = ({ animate, grid, flows, paths }: Flows) => {
  if (!animate || !grid.state.toHome) {
    return nothing;
  }

  return flowDot({
    path: "grid",
    className: "grid",
    durationSeconds: flows.gridToHome.durationSeconds,
    radius: paths.scale,
  });
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
        d=${paths.gridToHome.d}
        vector-effect="non-scaling-stroke"
      ></path>
    </svg>
    ${gridToHomeDot(context)}`;
};
