import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { reversePath } from "../reverse-path";
import { type Flows } from "./index";

/** Drawn from the battery to the grid. */
const batteryGridLine = "M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20";

const batteryFromGridDot = (animate: boolean, grid: Flows["grid"], flows: Flows["flows"]) => {
  if (!animate || !grid.state.toBattery) {
    return nothing;
  }

  return svg`<circle r="1" class="battery-from-grid" vector-effect="non-scaling-stroke">
      <animateMotion
        dur="${flows.batteryGrid.durationSeconds}s"
        repeatCount="indefinite"
        calcMode="paced"
        path="${reversePath(batteryGridLine)}"
      ></animateMotion>
    </circle>`;
};

const batteryToGridDot = (animate: boolean, battery: Flows["battery"], flows: Flows["flows"]) => {
  if (!animate || !battery.state.toGrid) {
    return nothing;
  }

  return svg`
    <circle r="1" class="battery-to-grid" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.batteryGrid.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-grid" />
      </animateMotion>
    </circle>
  `;
};

type FlowBatteryToGridFlows = Pick<Flows, Exclude<keyof Flows, "solar">>;

export const flowBatteryToGrid = ({
  battery,
  grid,
  lineClasses,
  animate,
  flows,
}: FlowBatteryToGridFlows) => {
  if (!flows.batteryGrid.visible) {
    return nothing;
  }
  return html`<div class="lines ${classMap(lineClasses)}">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="battery-grid-flow"
    >
      <path
        id="battery-grid"
        class="${flows.batteryGrid.lineClass}"
        d="${batteryGridLine}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${batteryFromGridDot(animate, grid, flows)} ${batteryToGridDot(animate, battery, flows)}
    </svg>
  </div>`;
};
