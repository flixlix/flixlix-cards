import { html, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { type Flows } from "./index";

/**
 * Runs from the grid to the battery, against the line's drawing direction: it follows the line
 * drawn backwards instead of `keyPoints`, which older Chromium ignores with `calcMode="paced"`.
 */
const batteryFromGridDot = ({ animate, grid, flows, paths }: Flows) => {
  if (!animate || !grid.state.toBattery || !paths.batteryToGrid) {
    return nothing;
  }

  return svg`<circle r=${paths.scale} class="battery-from-grid" vector-effect="non-scaling-stroke">
      <animateMotion
        dur="${flows.batteryGrid.durationSeconds}s"
        repeatCount="indefinite"
        calcMode="paced"
        path="${paths.batteryToGrid.reversed}"
      ></animateMotion>
    </circle>`;
};

const batteryToGridDot = ({ animate, battery, flows, paths }: Flows) => {
  if (!animate || !battery.state.toGrid) {
    return nothing;
  }

  return svg`
    <circle r=${paths.scale} class="battery-to-grid" vector-effect="non-scaling-stroke">
      <animateMotion dur="${flows.batteryGrid.durationSeconds}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#battery-grid" />
      </animateMotion>
    </circle>
  `;
};

export const flowBatteryToGrid = (context: Flows) => {
  const { flows, paths } = context;
  if (!flows.batteryGrid.visible || !paths.batteryToGrid) {
    return nothing;
  }
  return html`<svg class="flow" id="battery-grid-flow" viewBox=${context.viewBox}>
    <path
      id="battery-grid"
      class="${flows.batteryGrid.lineClass}"
      d=${paths.batteryToGrid.d}
      vector-effect="non-scaling-stroke"
    ></path>
    ${keyed(
      paths.batteryToGrid.d,
      svg`${batteryFromGridDot(context)} ${batteryToGridDot(context)}`
    )}
  </svg>`;
};
