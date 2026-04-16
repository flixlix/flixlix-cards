import { spacer } from "@flixlix-cards/shared/components/spacer";
import { type FossilEnergyConsumption } from "@flixlix-cards/shared/states/utils/energy-period";
import {
  type CardMainContext,
  type ConfigEntities,
  type FlowCardPlusConfig,
  type NewDur,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { computeIndividualFlowRate } from "@flixlix-cards/shared/utils/compute-flow-rate";
import { displayNonFossilState } from "@flixlix-cards/shared/utils/display-non-fossil-state";
import { showLine } from "@flixlix-cards/shared/utils/show-line";
import { styleLine } from "@flixlix-cards/shared/utils/style-line";
import { html, nothing, svg, type TemplateResult } from "lit";
import { generalSecondarySpan } from "./spans/general-secondary-span";

interface NonFossil {
  newDur: NewDur;
  templatesObj: TemplatesObj;
  entities: ConfigEntities;
  nonFossil: any;
  grid: any;
  fossilEnergyConsumption?: FossilEnergyConsumption;
}

export const nonFossilElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  { nonFossil, entities, templatesObj, grid, newDur, fossilEnergyConsumption }: NonFossil
): TemplateResult => {
  const disableEntityClick = config.clickable_entities === false;
  if (!nonFossil.hasPercentage) return spacer;
  return html`<div class="circle-container low-carbon">
    <span class="label">${nonFossil.name}</span>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        main.onEntityClick(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(
          e,
          entities.fossil_fuel_percentage,
          entities.fossil_fuel_percentage?.entity
        );
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(
            e,
            entities.fossil_fuel_percentage,
            entities.fossil_fuel_percentage?.entity,
            "tap"
          );
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${generalSecondarySpan(main.hass, main, config, templatesObj, nonFossil, "nonFossilFuel")}
      ${nonFossil.icon !== " "
        ? html` <ha-icon id="low-carbon-icon" .icon=${nonFossil.icon}></ha-icon>`
        : nothing}
      ${entities.fossil_fuel_percentage?.display_zero_state !== false ||
      (nonFossil.state.power || 0) > (entities.fossil_fuel_percentage?.display_zero_tolerance || 0)
        ? html`
            <span class="low-carbon"
              >${displayNonFossilState(
                main.hass,
                config,
                entities!.fossil_fuel_percentage!.entity,
                grid.state.fromGrid,
                fossilEnergyConsumption
              )}</span
            >
          `
        : nothing}
    </div>
    ${showLine(config, nonFossil.state.power || 0)
      ? html`
          <svg width="80" height="30">
            <path
              d="M40 -10 v40"
              class="low-carbon ${styleLine(nonFossil.state.power || 0, config)}"
              id="low-carbon"
            />
            ${checkShouldShowDots(config) && nonFossil.has && nonFossil.state.power > 0
              ? svg`<circle r="1.75" class="low-carbon" vector-effect="non-scaling-stroke">
                    <animateMotion
                      dur="${computeIndividualFlowRate(
                        entities.fossil_fuel_percentage?.calculate_flow_rate,
                        newDur.nonFossil
                      )}s"
                      repeatCount="indefinite"
                      calcMode="paced"
                    >
                      <mpath xlink:href="#low-carbon" />
                    </animateMotion>
                  </circle>`
              : nothing}
          </svg>
        `
      : nothing}
  </div>`;
};
