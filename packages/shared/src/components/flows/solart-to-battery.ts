import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const solarToBatteryDot = (animate: boolean, solar: Flows["solar"], flows: Flows["flows"]) => {
  if (!animate || !solar.state.toBattery) {
    return nothing;
  }

  return svg`<circle r="1" class="battery-solar" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToBattery.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-solar" />
      </animateMotion>
    </circle>`;
};

type FlowSolarToBatteryFlows = Pick<Flows, Exclude<keyof Flows, "grid">>;

export const flowSolarToBattery = ({
  solar,
  lineClasses,
  animate,
  flows,
}: FlowSolarToBatteryFlows) => {
  if (!flows.solarToBattery.visible) {
    return nothing;
  }

  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="solar-battery-flow"
      class="flat-line"
    >
      <path
        id="battery-solar"
        class="battery-solar ${flows.solarToBattery.lineClass}"
        d="M50,0 V100"
        vector-effect="non-scaling-stroke"
      ></path>
      ${solarToBatteryDot(animate, solar, flows)}
    </svg>
  </div>`;
};
