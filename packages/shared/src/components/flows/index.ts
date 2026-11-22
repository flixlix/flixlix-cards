import { auxiliaryConnection, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import {
  type BatteryObject,
  type FlowCardPlusConfig,
  type GridObject,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import { html } from "lit";
import { auxiliaryFlow } from "../auxiliary";
import { rightIndividualFlow } from "../individual-element";
import { flowBatteryToGrid } from "./battery-to-grid";
import { flowBatteryToHome } from "./battery-to-home";
import { type FlowLayout, type FlowPaths, flowPaths, nominalLayout } from "./geometry";
import { flowGridToHome } from "./grid-to-home";
import { flowSolarToGrid } from "./solar-to-grid";
import { flowSolarToHome } from "./solar-to-home";
import { flowSolarToBattery } from "./solart-to-battery";

export interface Flows {
  battery: BatteryObject;
  grid: GridObject;
  solar: SolarObject;
  flows: ReadyCardState["flows"];
  animate: boolean;
  paths: FlowPaths;
  /** Every flow is its own SVG, so each keeps its own animation clock; all share this box. */
  viewBox: string;
}

/** Width the card is drawn at before it has been measured. */
const NOMINAL_WIDTH = 400;

/**
 * Every flow line, drawn in overlays over the card content in the content's pixels, ending on
 * the node circles measured in `layout`.
 */
export const flowElement = (
  state: ReadyCardState,
  config: FlowCardPlusConfig,
  layout: FlowLayout | undefined
) => {
  const { battery, grid, solar, auxiliary } = state.nodes;
  const { rightTop, rightBottom } = state.individualSlots;
  const shown =
    layout ??
    nominalLayout(NOMINAL_WIDTH, {
      grid: grid.has,
      solar: solar.has,
      battery: battery.has,
      right: state.layout.hasRightIndividual,
      auxiliary: auxiliary.has,
    });
  const paths = flowPaths(shown, {
    hasBottomRow: state.layout.showBottomRow,
    auxiliaryConnection: auxiliaryConnection(config),
  });
  const viewBox = `0 0 ${shown.width} ${shown.height}`;
  const flows: Flows = {
    battery,
    grid,
    solar,
    flows: state.flows,
    animate: state.animate,
    paths,
    viewBox,
  };
  const right = { animate: state.animate, scale: paths.scale, viewBox };
  return html`<div class="flows" aria-hidden="true">
    ${flowSolarToHome(flows)} ${flowSolarToGrid(flows)} ${flowSolarToBattery(flows)}
    ${flowGridToHome(flows)} ${flowBatteryToHome(flows)} ${flowBatteryToGrid(flows)}
    ${rightIndividualFlow(rightTop, "right-top", paths.rightTopToHome, right)}
    ${rightIndividualFlow(rightBottom, "right-bottom", paths.rightBottomToHome, right)}
    ${auxiliaryFlow(auxiliary, state.flows.auxiliary, paths.auxiliary, right)}
  </div>`;
};
