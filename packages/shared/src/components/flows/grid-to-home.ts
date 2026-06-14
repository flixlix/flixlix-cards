import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { showLine } from "@flixlix-cards/shared/utils/show-line";
import { styleLine } from "@flixlix-cards/shared/utils/style-line";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "./index";

const gridToHomeDot = (
  config: FlowCardPlusConfig,
  grid: Flows["grid"],
  newDur: Flows["newDur"],
  pathD: string
) => {
  if (!checkShouldShowDots(config) || !grid.state.toHome) return nothing;

  return svg`<circle r="1" class="grid flow-dot"
    style="offset-path: path('${pathD}'); animation-duration: ${newDur.gridToHome}s;"
    vector-effect="non-scaling-stroke"></circle>`;
};

export const flowGridToHome = (
  config: FlowCardPlusConfig,
  { battery, grid, individual, solar, newDur }: Flows
) => {
  const shouldShow =
    grid.has && showLine(config, grid.state.fromGrid) && !config.entities.home?.hide;
  if (!shouldShow) return nothing;

  const gridToHomePathD = `M0,${battery.has ? 50 : solar.has ? 56 : 53} H100`;

  return html`<div
    class="lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((i) => i?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="grid-home-flow"
      class="flat-line"
    >
      <path
        class="grid ${styleLine(grid.state.toHome || 0, config)}"
        id="grid"
        d="${gridToHomePathD}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${gridToHomeDot(config, grid, newDur, gridToHomePathD)}
    </svg>
  </div>`;
};
