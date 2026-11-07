import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const solarToGridDot = (animate: boolean, solar: Flows["solar"], flows: Flows["flows"]) => {
  if (!animate || !solar.state.toGrid || !solar.has) {
    return nothing;
  }

  return svg`<circle r="1" class="return" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.solarToGrid.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#return" />
      </animateMotion>
    </circle>`;
};

export const flowSolarToGrid = ({ battery, solar, lineClasses, animate, flows }: Flows) => {
  if (!flows.solarToGrid.visible) {
    return nothing;
  }

  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="solar-grid-flow"
    >
      <path
        id="return"
        class="return ${flows.solarToGrid.lineClass}"
        d="M${battery.has ? 45 : 47},0 v15 c0,${
          battery.has ? "30 -10,30 -30,30" : "35 -10,35 -30,35"
        } h-20"
        vector-effect="non-scaling-stroke"
      ></path>
      ${solarToGridDot(animate, solar, flows)}
    </svg>
  </div>`;
};
