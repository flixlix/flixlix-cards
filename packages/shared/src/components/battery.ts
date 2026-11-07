import {
  type BatteryObject,
  type CardMainContext,
  type ComboEntity,
  type FlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { html, nothing } from "lit";

const batteryEntityId = (battery: BatteryObject, direction: keyof ComboEntity) =>
  typeof battery.entity === "object" ? battery.entity[direction] : battery.entity;

export const batteryElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  battery: BatteryObject
) => {
  const { entities } = config;
  const disableEntityClick = !config.clickable_entities;
  const circleTarget = () =>
    nonEmpty(entities.battery?.state_of_charge) ?? batteryEntityId(battery, "production");
  return html`<div class="circle-container battery">
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        const target = circleTarget();
        main.onEntityClick(e, battery, target);
      }}
      @dblclick=${(e: MouseEvent) => {
        const target = circleTarget();
        main.onEntityDoubleClick(e, battery, target);
      }}
      @pointerdown=${(e: PointerEvent) => {
        const target = circleTarget();
        main.onEntityPointerDown(e, battery, target);
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
          main.openDetails(e, battery, target, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${
        battery.state_of_charge.state !== null && entities.battery?.show_state_of_charge !== false
          ? html` <span
              @click=${(e: MouseEvent) => {
                main.onEntityClick(e, battery, entities.battery?.state_of_charge);
              }}
              @dblclick=${(e: MouseEvent) => {
                main.onEntityDoubleClick(e, battery, entities.battery?.state_of_charge);
              }}
              @pointerdown=${(e: PointerEvent) => {
                main.onEntityPointerDown(e, battery, entities.battery?.state_of_charge);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  main.openDetails(e, battery, entities.battery?.state_of_charge, "tap");
                }
              }}
              id="battery-state-of-charge-text"
            >
              ${battery.display.stateOfCharge}
            </span>`
          : nothing
      }
      ${
        battery.icon !== " "
          ? html` <ha-icon
              id="battery-icon"
              .icon=${battery.icon}
              @click=${(e: MouseEvent) => {
                main.onEntityClick(e, battery, entities.battery?.state_of_charge);
              }}
              @dblclick=${(e: MouseEvent) => {
                main.onEntityDoubleClick(e, battery, entities.battery?.state_of_charge);
              }}
              @pointerdown=${(e: PointerEvent) => {
                main.onEntityPointerDown(e, battery, entities.battery?.state_of_charge);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  main.openDetails(e, battery, entities.battery?.state_of_charge, "tap");
                }
              }}
            ></ha-icon>`
          : nothing
      }
      ${
        entities.battery?.display_state === "two_way" ||
        entities.battery?.display_state === undefined ||
        (entities.battery?.display_state === "one_way_no_zero" &&
          (battery.state.toBattery ?? 0) > 0) ||
        (entities.battery?.display_state === "one_way" && battery.state.toBattery !== 0)
          ? html`<span
              class="battery-in"
              @click=${(e: MouseEvent) => {
                const target = batteryEntityId(battery, "production");

                main.onEntityClick(e, entities.battery, target);
              }}
              @dblclick=${(e: MouseEvent) => {
                const target = batteryEntityId(battery, "production");
                main.onEntityDoubleClick(e, entities.battery, target);
              }}
              @pointerdown=${(e: PointerEvent) => {
                const target = batteryEntityId(battery, "production");
                main.onEntityPointerDown(e, entities.battery, target);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  const target = batteryEntityId(battery, "production");

                  main.openDetails(e, entities.battery, target, "tap");
                }
              }}
            >
              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
              ${battery.display.toBattery}</span
            >`
          : nothing
      }
      ${
        entities.battery?.display_state === "two_way" ||
        entities.battery?.display_state === undefined ||
        (entities.battery?.display_state === "one_way_no_zero" &&
          (battery.state.fromBattery ?? 0) > 0) ||
        (entities.battery?.display_state === "one_way" &&
          (battery.state.toBattery === 0 || battery.state.fromBattery !== 0))
          ? html`<span
              class="battery-out"
              @click=${(e: MouseEvent) => {
                const target = batteryEntityId(battery, "consumption");

                main.onEntityClick(e, entities.battery, target);
              }}
              @dblclick=${(e: MouseEvent) => {
                const target = batteryEntityId(battery, "consumption");
                main.onEntityDoubleClick(e, entities.battery, target);
              }}
              @pointerdown=${(e: PointerEvent) => {
                const target = batteryEntityId(battery, "consumption");
                main.onEntityPointerDown(e, entities.battery, target);
              }}
              @pointerup=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @pointercancel=${(e: PointerEvent) => {
                main.onEntityPointerUp(e);
              }}
              @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
                if (e.key === "Enter") {
                  const target = batteryEntityId(battery, "consumption");

                  main.openDetails(e, entities.battery, target, "tap");
                }
              }}
            >
              <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
              ${battery.display.fromBattery}</span
            >`
          : nothing
      }
    </div>
    <span class="label">${battery.name}</span>
  </div>`;
};
