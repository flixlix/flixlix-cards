import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

const batteryToHomeDot = ({ animate, battery, flows, paths }: Flows) => {
  if (!animate || !battery.state.toHome) {
    return nothing;
  }

  return flowDot({
    path: "battery-home",
    className: "battery-home",
    durationSeconds: flows.batteryToHome.durationSeconds,
    radius: paths.scale,
  });
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
    </svg>
    ${batteryToHomeDot(context)}`;
};
