import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

const solarToBatteryDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toBattery) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="battery-solar" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToBattery.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-solar" />
      </animateMotion>
    </circle>`;
};

export const flowSolarToBattery = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.solarToBattery.visible || !paths.solarToBattery) {
    return nothing;
  }

  return html`<svg class="flow" id="solar-battery-flow" viewBox=${context.viewBox}>
    <path
      id="battery-solar"
      class="battery-solar ${flows.solarToBattery.lineClass}"
      d=${paths.solarToBattery}
      vector-effect="non-scaling-stroke"
    ></path>
    ${keyed(paths.solarToBattery, solarToBatteryDot(context))}
  </svg>`;
};
