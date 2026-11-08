import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

const solarToGridDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toGrid || !solar.has) {
    return nothing;
  }

  return flowDot({
    path: "return",
    className: "return",
    durationSeconds: flows.solarToGrid.durationSeconds,
    radius: paths.scale,
  });
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
    </svg>
    ${solarToGridDot(context)}`;
};
