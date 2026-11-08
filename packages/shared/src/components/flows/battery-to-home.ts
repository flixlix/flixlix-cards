import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

const batteryToHomeDot = ({ animate, battery, flows, paths }: Flows) => {
  if (!animate || !battery.state.toHome) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="battery-home" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.batteryToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-home" />
      </animateMotion>
    </circle>`;
};

export const flowBatteryToHome = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.batteryToHome.visible || !paths.batteryToHome) {
    return nothing;
  }

  return html`<svg class="flow" id="battery-home-flow" viewBox=${context.viewBox}>
    <path
      id="battery-home"
      class="battery-home ${flows.batteryToHome.lineClass}"
      d=${paths.batteryToHome.d}
      vector-effect="non-scaling-stroke"
    ></path>
    ${keyed(paths.batteryToHome.d, batteryToHomeDot(context))}
  </svg>`;
};
