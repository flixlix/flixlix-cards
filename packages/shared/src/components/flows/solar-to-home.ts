import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

const solarToHomeDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toHome) {
    return nothing;
  }

  return flowDot({
    path: "solar",
    className: "solar",
    durationSeconds: flows.solarToHome.durationSeconds,
    radius: paths.scale,
  });
};

export const flowSolarToHome = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.solarToHome.visible || !paths.solarToHome) {
    return nothing;
  }

  return html`<svg class="flow" id="solar-home-flow" viewBox=${context.viewBox}>
      <path
        id="solar"
        class="solar ${flows.solarToHome.lineClass}"
        d=${paths.solarToHome.d}
        vector-effect="non-scaling-stroke"
      ></path>
    </svg>
    ${solarToHomeDot(context)}`;
};
