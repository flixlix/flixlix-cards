import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const solarToHomeDot = (animate: boolean, solar: Flows["solar"], flows: Flows["flows"]) => {
  if (!animate || !solar.state.toHome) {
    return nothing;
  }

  return svg`<circle r="1" class="solar" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#solar" />
      </animateMotion>
    </circle>`;
};

export const flowSolarToHome = ({ battery, grid, solar, lineClasses, animate, flows }: Flows) => {
  if (!flows.solarToHome.visible) {
    return nothing;
  }

  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="solar-home-flow"
    >
      <path
        id="solar"
        class="solar ${flows.solarToHome.lineClass}"
        d="M${battery.has ? 55 : 53},0 v${grid.has ? 15 : 17} c0,${
          battery.has ? "30 10,30 30,30" : "35 10,35 30,35"
        } h25"
        vector-effect="non-scaling-stroke"
      ></path>
      ${solarToHomeDot(animate, solar, flows)}
    </svg>
  </div>`;
};
