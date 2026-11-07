import {
  type CardMainContext,
  type ComboEntity,
  type FlowCardPlusConfig,
  type GridObject,
} from "@flixlix-cards/shared/types";
import { html, nothing } from "lit";
import { type DisplayState, directionShown } from "./display-state";
import { generalSecondarySpan } from "./spans/general-secondary-span";

const gridEntityId = (grid: GridObject, direction: keyof ComboEntity) =>
  typeof grid.entity === "object" ? grid.entity[direction] : grid.entity;

const returnShown = (grid: GridObject, displayState: DisplayState): boolean => {
  const { fromGrid, toGrid } = grid.state;
  if (toGrid === null || grid.powerOutage.isOutage) {
    return false;
  }
  return directionShown(displayState, {
    nonZero: toGrid > 0,
    oneWay: (fromGrid === null || fromGrid === 0) && toGrid !== 0,
  });
};

/** During an outage, consumption shows the generator's output if there is one. */
const consumptionShown = (grid: GridObject, displayState: DisplayState): boolean => {
  const { fromGrid, toGrid } = grid.state;
  if (grid.powerOutage.isOutage) {
    return !!grid.powerOutage.entityGenerator;
  }
  if (fromGrid === null) {
    return false;
  }
  return directionShown(displayState, {
    nonZero: fromGrid > 0,
    oneWay: toGrid === null || toGrid === 0,
  });
};

export const gridElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  grid: GridObject
) => {
  const { entities } = config;
  const displayState = entities.grid?.display_state;
  const disableEntityClick = !config.clickable_entities;
  const circleTarget = () => {
    const outageTarget = grid.powerOutage.entityGenerator ?? entities.grid?.power_outage?.entity;
    return grid.powerOutage.isOutage && outageTarget
      ? outageTarget
      : gridEntityId(grid, "consumption");
  };
  return html`<div class="circle-container grid">
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        const target = circleTarget();
        main.onEntityClick(e, grid, target);
      }}
      @dblclick=${(e: MouseEvent) => {
        const target = circleTarget();
        main.onEntityDoubleClick(e, grid, target);
      }}
      @pointerdown=${(e: PointerEvent) => {
        const target = circleTarget();
        main.onEntityPointerDown(e, entities.grid, target);
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          const target = circleTarget();
          main.openDetails(e, entities.grid, target, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${generalSecondarySpan(main, grid.secondary, "grid")}
      ${grid.icon !== " " ? html` <ha-icon id="grid-icon" .icon=${grid.icon}></ha-icon>` : nothing}
      ${
        returnShown(grid, displayState)
          ? html`<span
              class="return"
              @click=${(e: MouseEvent) => {
                const target = gridEntityId(grid, "production");
                main.onEntityClick(e, grid, target);
              }}
              @dblclick=${(e: MouseEvent) => {
                const target = gridEntityId(grid, "production");
                main.onEntityDoubleClick(e, grid, target);
              }}
              @pointerdown=${(e: PointerEvent) => {
                const target = gridEntityId(grid, "production");
                main.onEntityPointerDown(e, entities.grid, target);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  const target = gridEntityId(grid, "production");
                  main.openDetails(e, entities.grid, target, "tap");
                }
              }}
            >
              <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>

              ${grid.display.toGrid}
            </span>`
          : nothing
      }
      ${
        consumptionShown(grid, displayState)
          ? html` <span
              class="consumption"
              @click=${(e: MouseEvent) => {
                const target = gridEntityId(grid, "consumption");
                main.onEntityClick(e, grid, target);
              }}
              @dblclick=${(e: MouseEvent) => {
                const target = gridEntityId(grid, "consumption");
                main.onEntityDoubleClick(e, grid, target);
              }}
              @pointerdown=${(e: PointerEvent) => {
                const target = gridEntityId(grid, "consumption");
                main.onEntityPointerDown(e, entities.grid, target);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  const target = gridEntityId(grid, "consumption");
                  main.openDetails(e, entities.grid, target, "tap");
                }
              }}
            >
              <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
              ${grid.display.fromGrid}
            </span>`
          : nothing
      }
      ${
        grid.powerOutage.isOutage && !grid.powerOutage.entityGenerator
          ? html`<span class="grid power-outage">${grid.powerOutage.name}</span>`
          : nothing
      }
    </div>
    <span class="label">${grid.name}</span>
  </div>`;
};
