import { type FlowName, type ReadyCardState } from "@flixlix-cards/shared/card-state";

const FLOW_SVG_IDS: [FlowName, string][] = [
  ["batteryGrid", "battery-grid-flow"],
  ["batteryToHome", "battery-home-flow"],
  ["gridToHome", "grid-home-flow"],
  ["solarToBattery", "solar-battery-flow"],
  ["solarToGrid", "solar-grid-flow"],
  ["solarToHome", "solar-home-flow"],
];

/** Applies the parts of a card state that live outside the rendered template. */
export const applyCardState = (host: HTMLElement, state: ReadyCardState): void => {
  for (const [name, value] of Object.entries(state.cssVars)) {
    host.style.setProperty(name, value);
  }
  for (const [name, id] of FLOW_SVG_IDS) {
    const ratio = state.animationRescale[name];
    const flow = host.shadowRoot?.querySelector<SVGSVGElement>(`#${id}`);
    if (ratio === undefined || !flow) {
      continue;
    }
    flow.pauseAnimations();
    flow.setCurrentTime(flow.getCurrentTime() * ratio);
    flow.unpauseAnimations();
  }
};
