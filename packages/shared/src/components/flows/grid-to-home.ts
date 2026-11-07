import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const gridToHomeDot = (animate: boolean, grid: Flows["grid"], flows: Flows["flows"]) => {
  if (!animate || !grid.state.toHome) {
    return nothing;
  }

  return svg`<circle r="1" class="grid" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.gridToHome.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#grid" />
      </animateMotion>
    </circle>`;
};

export const flowGridToHome = ({ battery, grid, solar, lineClasses, animate, flows }: Flows) => {
  if (!flows.gridToHome.visible) {
    return nothing;
  }

  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="grid-home-flow"
      class="flat-line"
    >
      <path
        class="grid ${flows.gridToHome.lineClass}"
        id="grid"
        d="M0,${battery.has ? 50 : solar.has ? 56 : 53} H100"
        vector-effect="non-scaling-stroke"
      ></path>
      ${gridToHomeDot(animate, grid, flows)}
    </svg>
  </div>`;
};
