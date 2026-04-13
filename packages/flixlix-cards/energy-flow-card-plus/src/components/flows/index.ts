import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { type IndividualObject } from "@/states/raw/individual/get-individual-object";
import { type NewDur } from "@/type";
import { html } from "lit";
import { flowBatteryToGrid } from "./battery-to-grid";
import { flowBatteryToHome } from "./battery-to-home";
import { flowGridToHome } from "./grid-to-home";
import { flowSolarToGrid } from "./solar-to-grid";
import { flowSolarToHome } from "./solar-to-home";
import { flowSolarToBattery } from "./solart-to-battery";

export interface Flows {
  battery: any;
  grid: any;
  individual: IndividualObject[];
  solar: any;
  newDur: NewDur;
}

export const flowElement = (
  config: EnergyFlowCardPlusConfig,
  { battery, grid, individual, solar, newDur }: Flows
) => {
  return html`
  ${flowSolarToHome(config, { battery, grid, individual, solar, newDur })}
  ${flowSolarToGrid(config, { battery, grid, individual, solar, newDur })}
  ${flowSolarToBattery(config, { battery, individual, solar, newDur })}
  ${flowGridToHome(config, { battery, grid, individual, solar, newDur })}
  ${flowBatteryToHome(config, { battery, grid, individual, newDur })}
  ${flowBatteryToGrid(config, { battery, grid, individual, newDur })}
</div>`;
};
