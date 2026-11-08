import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

const solarToHomeDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toHome) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="solar" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#solar" />
      </animateMotion>
    </circle>`;
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
    ${keyed(paths.solarToHome.d, solarToHomeDot(context))}
  </svg>`;
};
