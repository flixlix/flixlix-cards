import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import { html, nothing } from "lit";
import { generalSecondarySpan } from "./spans/general-secondary-span";

export const solarElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  solar: SolarObject
) => {
  const disableEntityClick = !config.clickable_entities;
  return html`<div class="circle-container solar">
    <span class="label">${solar.name}</span>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        main.onEntityClick(e, solar, solar.entity);
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(e, solar, solar.entity);
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(e, solar, solar.entity);
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(e, solar, solar.entity, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${generalSecondarySpan(main, solar.secondary, "solar")}
      ${
        solar.icon !== " "
          ? html` <ha-icon id="solar-icon" .icon=${solar.icon}></ha-icon>`
          : nothing
      }
      ${
        solar.display === undefined ? nothing : html` <span class="solar"> ${solar.display} </span>`
      }
    </div>
  </div>`;
};
