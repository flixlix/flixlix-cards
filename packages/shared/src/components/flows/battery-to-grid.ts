import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

/** Runs from the grid to the battery, against the line's drawing direction. */
const batteryFromGridDot = ({ animate, grid, flows, paths }: Flows) => {
  if (!animate || !grid.state.toBattery || !paths.batteryToGrid) {
    return nothing;
  }

  return flowDot({
    path: "battery-grid",
    className: "battery-from-grid",
    durationSeconds: flows.batteryGrid.durationSeconds,
    radius: paths.scale,
    reverse: true,
  });
};

const batteryToGridDot = ({ animate, battery, flows, paths }: Flows) => {
  if (!animate || !battery.state.toGrid) {
    return nothing;
  }

  return flowDot({
    path: "battery-grid",
    className: "battery-to-grid",
    durationSeconds: flows.batteryGrid.durationSeconds,
    radius: paths.scale,
  });
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
    </svg>
    ${batteryFromGridDot(context)} ${batteryToGridDot(context)}`;
};
