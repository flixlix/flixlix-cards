import {
  type CardMainContext,
  type ComboEntity,
  type ConfigEntities,
  type FlowCardPlusConfig,
  type GridObject,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing } from "lit";
import { generalSecondarySpan } from "./spans/general-secondary-span";

const gridEntityId = (grid: GridObject, direction: keyof ComboEntity) =>
  typeof grid.entity === "object" ? grid.entity[direction] : grid.entity;

export const gridElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    entities,
    grid,
    templatesObj,
  }: { entities: ConfigEntities; grid: GridObject; templatesObj: TemplatesObj }
) => {
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
      ${generalSecondarySpan(main.hass, main, config, templatesObj, grid, "grid")}
      ${grid.icon !== " " ? html` <ha-icon id="grid-icon" .icon=${grid.icon}></ha-icon>` : nothing}
      ${
        (entities.grid?.display_state === "two_way" ||
          entities.grid?.display_state === undefined ||
          (entities.grid?.display_state === "one_way_no_zero" && (grid.state.toGrid ?? 0) > 0) ||
          (entities.grid?.display_state === "one_way" &&
            (grid.state.fromGrid === null || grid.state.fromGrid === 0) &&
            grid.state.toGrid !== 0)) &&
        grid.state.toGrid !== null &&
        !grid.powerOutage.isOutage
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

              ${displayValue(main.hass, config, grid.state.toGrid, {})}
            </span>`
          : nothing
      }
      ${
        ((entities.grid?.display_state === "two_way" ||
          entities.grid?.display_state === undefined ||
          (entities.grid?.display_state === "one_way_no_zero" && (grid.state.fromGrid ?? 0) > 0) ||
          (entities.grid?.display_state === "one_way" &&
            (grid.state.toGrid === null || grid.state.toGrid === 0))) &&
          grid.state.fromGrid !== null &&
          !grid.powerOutage.isOutage) ||
        (grid.powerOutage.isOutage && !!grid.powerOutage.entityGenerator)
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
              ${displayValue(main.hass, config, grid.state.fromGrid, {})}
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
