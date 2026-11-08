import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const batteryToHomeDot = (
  animate: boolean,
  battery: FlowBatteryToHomeFlows["battery"],
  flows: Flows["flows"]
) => {
  if (!animate || !battery.state.toHome) {
    return nothing;
  }

  return svg`<circle r="1" class="battery-home" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.batteryToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-home" />
      </animateMotion>
    </circle>`;
};

type FlowBatteryToHomeFlows = Pick<Flows, Exclude<keyof Flows, "solar">>;

export const flowBatteryToHome = ({
  battery,
  grid,
  lineClasses,
  animate,
  flows,
}: FlowBatteryToHomeFlows) => {
  if (!flows.batteryToHome.visible) {
    return nothing;
  }

  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="battery-home-flow"
    >
      <path
        id="battery-home"
        class="battery-home ${flows.batteryToHome.lineClass}"
        d="M55,100 v-${grid.has ? 15 : 17} c0,-30 10,-30 30,-30 h20"
        vector-effect="non-scaling-stroke"
      ></path>
      ${batteryToHomeDot(animate, battery, flows)}
    </svg>
  </div>`;
};
