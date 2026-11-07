import { type ReadyCardState } from "@flixlix-cards/shared/card-state";
import {
  type BatteryObject,
  type FlowCardPlusConfig,
  type GridObject,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import { html } from "lit";
import { type ClassInfo } from "lit/directives/class-map.js";
import { flowBatteryToGrid } from "./battery-to-grid";
import { flowBatteryToHome } from "./battery-to-home";
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
  lineClasses: ClassInfo;
}

export const flowElement = (config: FlowCardPlusConfig, state: ReadyCardState) => {
  const { battery, grid, solar } = state.nodes;
  const flows: Flows = {
    battery,
    grid,
    solar,
    flows: state.flows,
    animate: state.animate,
    lineClasses: {
      high: state.layout.showBottomRow,
      "individual1-individual2": !battery.has,
      "multi-individual": state.layout.hasRightIndividual,
    },
  };
  return html`
  ${flowSolarToHome(flows)}
  ${flowSolarToGrid(flows)}
  ${flowSolarToBattery(flows)}
  ${flowGridToHome(flows)}
  ${flowBatteryToHome(flows)}
  ${flowBatteryToGrid(flows)}
</div>`;
};
