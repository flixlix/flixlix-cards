import { html, nothing } from "lit";
import { flowDot } from "../flow-dot";
import { type Flows } from "./index";

const solarToBatteryDot = ({ animate, solar, flows, paths }: Flows) => {
  if (!animate || !solar.state.toBattery) {
    return nothing;
  }

  return flowDot({
    path: "battery-solar",
    className: "battery-solar",
    durationSeconds: flows.solarToBattery.durationSeconds,
    radius: paths.scale,
  });
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
        d=${paths.solarToBattery.d}
        vector-effect="non-scaling-stroke"
      ></path>
    </svg>
    ${solarToBatteryDot(context)}`;
};
